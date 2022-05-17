// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../access/Governable.sol";
import "../interfaces/swapper/ISwapper.sol";
import "../interfaces/swapper/IExchange.sol";

/**
 * @notice Swapper contract
 * This contract encapsulates DEXes and use them to perform swaps using the best trade path as possible
 */
contract Swapper is ISwapper, Governable {
    using SafeERC20 for IERC20;
    using EnumerableSet for EnumerableSet.AddressSet;

    /**
     * @notice Supported exchanges
     */
    EnumerableSet.AddressSet private exchanges;

    /**
     * @notice The oracle contract
     * @dev This is used to set acceptable slippage parameters
     */
    IChainlinkAndFallbacksOracle public override oracle;

    /**
     * @notice Max slippage acceptable
     * @dev Use 18 decimals (e.g. 0.2e18 = 20%)
     */
    uint256 public override maxSlippage;

    /// @notice Emitted when an exchange is added
    event ExchangeAdded(address exchange);

    /// @notice Emitted when an exchange is removed
    event ExchangeRemoved(address exchange);

    /// @notice Emitted when the oracle is updated
    event OracleUpdated(IChainlinkAndFallbacksOracle oldOracle, IChainlinkAndFallbacksOracle newOracle);

    /// @notice Emitted when the max slippage is updated
    event MaxSlippageUpdated(uint256 oldMaxSlippage, uint256 newMaxSlippage);

    constructor(IChainlinkAndFallbacksOracle oracle_, uint256 maxSlippage_) {
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
        view
        returns (
            uint256 _amountIn,
            uint256 _amountInMax,
            IExchange _exchange,
            address[] memory _path
        )
    {
        _exchange = IExchange(exchanges.at(0));
        (_amountIn, _path) = _getBestAmountIn(_exchange, tokenIn_, tokenOut_, amountOut_);
        uint256 _len = exchanges.length();
        for (uint256 i = 1; i < _len; ++i) {
            IExchange _iExchange = IExchange(exchanges.at(i));
            (uint256 _iAmountIn, address[] memory _iPath) = _getBestAmountIn(
                _iExchange,
                tokenIn_,
                tokenOut_,
                amountOut_
            );
            if (_iAmountIn > 0 && _iAmountIn < _amountIn) {
                _amountIn = _iAmountIn;
                _exchange = _iExchange;
                _path = _iPath;
            }
        }
        require(_path.length > 0, "no-path-found");

        uint256 _amountInFromOracle = oracle.quote(tokenOut_, tokenIn_, amountOut_);
        _amountInMax = (_amountInFromOracle * (1e18 + maxSlippage)) / 1e18;
    }

    /// @inheritdoc ISwapper
    function getBestAmountOut(
        address tokenIn_,
        address tokenOut_,
        uint256 amountIn_
    )
        public
        view
        returns (
            uint256 _amountOut,
            uint256 _amountOutMin,
            IExchange _exchange,
            address[] memory _path
        )
    {
        _exchange = IExchange(exchanges.at(0));
        (_amountOut, _path) = _getBestAmountOut(_exchange, tokenIn_, tokenOut_, amountIn_);
        uint256 _len = exchanges.length();
        for (uint256 i = 1; i < _len; ++i) {
            IExchange _iExchange = IExchange(exchanges.at(i));
            (uint256 _iAmountOut, address[] memory _iPath) = _getBestAmountOut(
                _iExchange,
                tokenIn_,
                tokenOut_,
                amountIn_
            );
            if (_iAmountOut > _amountOut) {
                _amountOut = _iAmountOut;
                _exchange = _iExchange;
                _path = _iPath;
            }
        }
        require(_path.length > 0, "no-path-found");

        uint256 _amountOutFromOracle = oracle.quote(tokenIn_, tokenOut_, amountIn_);
        _amountOutMin = (_amountOutFromOracle * (1e18 - maxSlippage)) / 1e18;
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
        (, uint256 _amountOutMin, IExchange _exchange, address[] memory _path) = getBestAmountOut(
            tokenIn_,
            tokenOut_,
            amountIn_
        );
        IERC20(tokenIn_).safeTransferFrom(_msgSender(), address(_exchange), amountIn_);
        return _exchange.swapExactInput(_path, amountIn_, _amountOutMin, receiver_);
    }

    /// @inheritdoc ISwapper
    function swapExactOutput(
        address tokenIn_,
        address tokenOut_,
        uint256 amountOut_,
        address receiver_
    ) external returns (uint256 _amountIn) {
        (, uint256 _amountInMax, IExchange _exchange, address[] memory _path) = getBestAmountIn(
            tokenIn_,
            tokenOut_,
            amountOut_
        );
        address _caller = _msgSender();
        IERC20(tokenIn_).safeTransferFrom(_caller, address(_exchange), _amountInMax);
        return _exchange.swapExactOutput(_path, amountOut_, _amountInMax, _caller, receiver_);
    }

    /**
     * @notice Wraps `exchange.getBestAmountIn()` function
     * @dev Returns `(0,[])` if reverts
     */
    function _getBestAmountIn(
        IExchange exchange_,
        address tokenIn_,
        address tokenOut_,
        uint256 amountOut_
    ) private view returns (uint256 _amountIn, address[] memory _path) {
        try exchange_.getBestAmountIn(tokenIn_, tokenOut_, amountOut_) returns (
            uint256 __amountIn,
            address[] memory __path
        ) {
            _amountIn = __amountIn;
            _path = __path;
        } catch {}
    }

    /**
     * @notice Wraps `exchange.getBestAmountOut()` function
     * @dev Returns `(0,[])` if reverts
     */
    function _getBestAmountOut(
        IExchange exchange_,
        address tokenIn_,
        address tokenOut_,
        uint256 amountIn_
    ) private view returns (uint256 _amountOut, address[] memory _path) {
        try exchange_.getBestAmountOut(tokenIn_, tokenOut_, amountIn_) returns (
            uint256 __amountOut,
            address[] memory __path
        ) {
            _amountOut = __amountOut;
            _path = __path;
        } catch {}
    }

    /**
     * @notice Add exchange
     */
    function addExchange(address exchange_) external onlyGovernor {
        require(exchange_ != address(0), "address-is-null");
        require(exchanges.add(exchange_), "exchange-exists");
        emit ExchangeAdded(exchange_);
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
    function updateOracle(IChainlinkAndFallbacksOracle oracle_) external onlyGovernor {
        require(address(oracle_) != address(0), "address-is-null");
        emit OracleUpdated(oracle, oracle_);
        oracle = oracle_;
    }

    /**
     * @notice Remove exchange
     */
    function removeExchange(address exchange_) external onlyGovernor {
        require(exchanges.remove(exchange_), "exchange-does-not-exist");
        emit ExchangeRemoved(exchange_);
    }
}
