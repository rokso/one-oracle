// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../access/Governable.sol";
import "../interfaces/swapper/ISwapper.sol";
import "../interfaces/swapper/IExchange.sol";
import "../libraries/DataTypes.sol";

/**
 * @notice Swapper contract
 * This contract encapsulates DEXes and use them to perform swaps using the best trade path as possible
 */
contract Swapper is ISwapper, Governable {
    using SafeERC20 for IERC20;
    using EnumerableSet for EnumerableSet.AddressSet;

    /**
     * @notice List of the supported exchanges
     */
    EnumerableSet.AddressSet private exchanges;

    /**
     * @notice Mapping of exchanges' addresses by type
     */
    mapping(DataTypes.ExchangeType => address) public addressOf;

    /**
     * @notice Preferable swap paths
     * @dev Used to save gas by using a preset path instead of looking for the best
     */
    mapping(bytes => bytes) public preferablePaths;

    /**
     * @notice The oracle contract
     * @dev This is used to set acceptable slippage parameters
     */
    IOracle public override oracle;

    /**
     * @notice Max slippage acceptable
     * @dev Use 18 decimals (e.g. 0.2e18 = 20%)
     */
    uint256 public override maxSlippage;

    /// @notice Emitted when an exchange is added
    event ExchangeUpdated(
        DataTypes.ExchangeType indexed exchangeType,
        address indexed oldExchange,
        address indexed newExchange
    );

    /// @notice Emitted when the oracle is updated
    event OracleUpdated(IOracle indexed oldOracle, IOracle indexed newOracle);

    /// @notice Emitted when the max slippage is updated
    event MaxSlippageUpdated(uint256 oldMaxSlippage, uint256 newMaxSlippage);

    /// @notice Emitted when exact-input swap is executed
    event SwapExactInput(
        IExchange indexed exchange,
        bytes path,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );

    /// @notice Emitted when exact-output swap is executed
    event SwapExactOutput(
        IExchange indexed exchange,
        bytes path,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountInMax,
        uint256 amountIn,
        uint256 amountOut
    );

    /// @notice Emitted when preferable path is updated
    event PreferablePathUpdated(bytes key, bytes oldPath, bytes newPath);

    constructor(IOracle oracle_, uint256 maxSlippage_) {
        require(address(oracle_) != address(0), "oracle-is-null");
        oracle = oracle_;
        maxSlippage = maxSlippage_;
    }

    /// @inheritdoc ISwapper
    function getBestAmountIn(
        address tokenIn_,
        address tokenOut_,
        uint256 amountOut_
    )
        public
        returns (
            uint256 _amountInMax,
            IExchange _exchange,
            bytes memory _path
        )
    {
        _amountInMax = (oracle.quote(tokenOut_, tokenIn_, amountOut_) * (1e18 + maxSlippage)) / 1e18;
        uint256 _amountIn = type(uint256).max;

        // 1. Return preferable path if any
        bytes memory _preferablePath = preferablePaths[
            abi.encodePacked(DataTypes.SwapType.EXACT_OUTPUT, tokenIn_, tokenOut_)
        ];
        if (_preferablePath.length > 0) {
            DataTypes.ExchangeType _exchangeType;
            (_exchangeType, _path) = abi.decode(_preferablePath, (DataTypes.ExchangeType, bytes));
            return (_amountInMax, IExchange(addressOf[_exchangeType]), _path);
        }

        // 2. Look for the best path
        uint256 _len = exchanges.length();
        for (uint256 i; i < _len; ++i) {
            IExchange _iExchange = IExchange(exchanges.at(i));
            (uint256 _iAmountIn, bytes memory _iPath) = _iExchange.getBestAmountIn(tokenIn_, tokenOut_, amountOut_);
            if (_iAmountIn > 0 && _iAmountIn < _amountIn && _iAmountIn <= _amountInMax) {
                _amountIn = _iAmountIn;
                _exchange = _iExchange;
                _path = _iPath;
            }
        }
        require(_path.length > 0, "no-path-found");
    }

    /// @inheritdoc ISwapper
    function getBestAmountOut(
        address tokenIn_,
        address tokenOut_,
        uint256 amountIn_
    )
        public
        returns (
            uint256 _amountOutMin,
            IExchange _exchange,
            bytes memory _path
        )
    {
        _amountOutMin = (oracle.quote(tokenIn_, tokenOut_, amountIn_) * (1e18 - maxSlippage)) / 1e18;
        uint256 _amountOut;

        // 1. Return preferable path if any
        bytes memory _preferablePath = preferablePaths[
            abi.encodePacked(DataTypes.SwapType.EXACT_INPUT, tokenIn_, tokenOut_)
        ];
        if (_preferablePath.length > 0) {
            DataTypes.ExchangeType _exchangeType;
            (_exchangeType, _path) = abi.decode(_preferablePath, (DataTypes.ExchangeType, bytes));
            return (_amountOutMin, IExchange(addressOf[_exchangeType]), _path);
        }

        // 2. Look for the best path
        uint256 _len = exchanges.length();
        for (uint256 i; i < _len; ++i) {
            IExchange _iExchange = IExchange(exchanges.at(i));
            (uint256 _iAmountOut, bytes memory _iPath) = _iExchange.getBestAmountOut(tokenIn_, tokenOut_, amountIn_);
            if (_iAmountOut > _amountOut && _iAmountOut >= _amountOutMin) {
                _amountOut = _iAmountOut;
                _exchange = _iExchange;
                _path = _iPath;
            }
        }

        require(_path.length > 0, "no-path-found");
    }

    /// @inheritdoc ISwapper
    function getExchanges() external view override returns (address[] memory) {
        return exchanges.values();
    }

    /// @inheritdoc ISwapper
    function swapExactInput(
        address tokenIn_,
        address tokenOut_,
        uint256 amountIn_,
        address receiver_
    ) external returns (uint256 _amountOut) {
        (uint256 _amountOutMin, IExchange _exchange, bytes memory _path) = getBestAmountOut(
            tokenIn_,
            tokenOut_,
            amountIn_
        );
        IERC20(tokenIn_).safeTransferFrom(_msgSender(), address(_exchange), amountIn_);
        _amountOut = _exchange.swapExactInput(_path, amountIn_, _amountOutMin, receiver_);
        emit SwapExactInput(_exchange, _path, tokenIn_, tokenOut_, amountIn_, _amountOut);
    }

    /// @inheritdoc ISwapper
    function swapExactOutput(
        address tokenIn_,
        address tokenOut_,
        uint256 amountOut_,
        address receiver_
    ) external returns (uint256 _amountIn) {
        (uint256 _amountInMax, IExchange _exchange, bytes memory _path) = getBestAmountIn(
            tokenIn_,
            tokenOut_,
            amountOut_
        );
        address _caller = _msgSender();
        IERC20(tokenIn_).safeTransferFrom(_caller, address(_exchange), _amountInMax);
        _amountIn = _exchange.swapExactOutput(_path, amountOut_, _amountInMax, _caller, receiver_);
        emit SwapExactOutput(_exchange, _path, tokenIn_, tokenOut_, _amountInMax, _amountIn, amountOut_);
    }

    /**
     * @notice Add or update exchange
     * @dev Use null `exchange_` for removal
     */
    function setExchange(DataTypes.ExchangeType type_, address exchange_) external onlyGovernor {
        address _currentExchange = addressOf[type_];
        if (exchange_ == address(0)) {
            require(exchanges.remove(_currentExchange), "exchange-does-not-exist");
            delete addressOf[type_];
        } else {
            require(exchanges.add(exchange_), "exchange-exists");
            addressOf[type_] = exchange_;
        }
        emit ExchangeUpdated(type_, _currentExchange, exchange_);
    }

    /**
     * @notice Update max slippage
     */
    function updateMaxSlippage(uint256 maxSlippage_) external onlyGovernor {
        emit MaxSlippageUpdated(maxSlippage, maxSlippage_);
        maxSlippage = maxSlippage_;
    }

    /**
     * @notice Update oracle contract
     */
    function updateOracle(IOracle oracle_) external onlyGovernor {
        require(address(oracle_) != address(0), "address-is-null");
        emit OracleUpdated(oracle, oracle_);
        oracle = oracle_;
    }

    /**
     * @notice Set preferable path
     * @dev Use empty `path_` for removal
     * @param swapType_ If the path is related to `EXACT_INPUT` or `EXACT_OUTPUT`
     * @param tokenIn_ The swap in token
     * @param tokenOut_ The swap out token
     * @param exchange_ The type (i.e. protocol) of the exchange
     * @param path_ The swap path
     * @dev Use `abi.encodePacked(tokenA, poolFee1, tokenB, poolFee2, tokenC, ...)` for UniswapV3 exchange
     * @dev Use `abi.encode([tokenA, tokenB, tokenC, ...])` for UniswapV2-like exchanges
     */
    function setPreferablePath(
        DataTypes.SwapType swapType_,
        address tokenIn_,
        address tokenOut_,
        DataTypes.ExchangeType exchange_,
        bytes calldata path_
    ) external onlyGovernor {
        bytes memory _key = abi.encodePacked(swapType_, tokenIn_, tokenOut_);
        bytes memory _currentPath = preferablePaths[_key];
        bytes memory _newPath = abi.encode(exchange_, path_);
        if (path_.length == 0) {
            delete preferablePaths[_key];
        } else {
            preferablePaths[_key] = _newPath;
        }
        emit PreferablePathUpdated(_key, _currentPath, _newPath);
    }
}
