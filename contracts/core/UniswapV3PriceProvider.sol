// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "@openzeppelin/contracts/utils/math/SafeCast.sol";
import "../access/Governable.sol";
import "../interfaces/utils/IUniswapV3CrossPoolOracle.sol";
import "../interfaces/core/IUniswapV3PriceProvider.sol";
import "./PriceProvider.sol";

contract UniswapV3PriceProvider is IUniswapV3PriceProvider, Governable, PriceProvider {
    /**
     * @notice The UniswapV3CrossPoolOracle contract
     * @dev This contract encapsulates UniswapV3 oracle logic
     */
    IUniswapV3CrossPoolOracle public immutable crossPoolOracle;

    /**
     * @notice The time-weighted average price (TWAP) period
     * @dev See more: https://docs.uniswap.org/protocol/concepts/V3-overview/oracle
     */
    uint32 public override defaultTwapPeriod;

    /**
     * @notice The default pool fee to use
     * @dev Use 1e6 for 100% (e.g 3000 is 0.3%)
     */
    uint24 public defaultPoolFee;

    /// @notice Emitted when the default TWAP period is updated
    event DefaultTwapPeriodUpdated(uint32 oldDefaultTwapPeriod, uint32 newDefaultTwapPeriod);

    /// @notice Emitted when the default pool fee updated
    event DefaultPoolFeeUpdated(uint24 oldDefaultPoolFee, uint24 newDefaultPoolFee);

    constructor(
        IUniswapV3CrossPoolOracle crossPoolOracle_,
        uint32 defaultTwapPeriod_,
        uint24 defaultFee_
    ) {
        require(address(crossPoolOracle_) != address(0), "cross-pool-is-null");
        crossPoolOracle = crossPoolOracle_;
        defaultTwapPeriod = defaultTwapPeriod_;
        defaultPoolFee = defaultFee_;
    }

    /// @inheritdoc IPriceProvider
    function getPriceInUsd(address token_)
        public
        view
        override(IPriceProvider, PriceProvider)
        returns (uint256 _priceInUsd, uint256 _lastUpdatedAt)
    {
        return getPriceInUsd(token_, defaultPoolFee, defaultTwapPeriod);
    }

    /// @inheritdoc IUniswapV3PriceProvider
    function getPriceInUsd(address token_, uint32 twapPeriod_)
        public
        view
        override
        returns (uint256 _priceInUsd, uint256 _lastUpdatedAt)
    {
        return getPriceInUsd(token_, defaultPoolFee, twapPeriod_);
    }

    /// @inheritdoc IUniswapV3PriceProvider
    function getPriceInUsd(address token_, uint24 poolFee_)
        public
        view
        override
        returns (uint256 _priceInUsd, uint256 _lastUpdatedAt)
    {
        return getPriceInUsd(token_, poolFee_, defaultTwapPeriod);
    }

    /// @inheritdoc IUniswapV3PriceProvider
    function getPriceInUsd(
        address token_,
        uint24 poolFee_,
        uint32 twapPeriod_
    ) public view override returns (uint256 _priceInUsd, uint256 _lastUpdatedAt) {
        IStableCoinProvider _stableCoinProvider = addressProvider.stableCoinProvider();
        require(address(_stableCoinProvider) != address(0), "stable-coin-not-supported");

        uint256 _stableCoinAmount;
        (_stableCoinAmount, _lastUpdatedAt) = quote(
            token_,
            _stableCoinProvider.getStableCoinIfPegged(),
            poolFee_,
            twapPeriod_,
            10**IERC20Metadata(token_).decimals() // ONE
        );

        _priceInUsd = _stableCoinProvider.toUsdRepresentation(_stableCoinAmount);
    }

    /// @inheritdoc IPriceProvider
    function quote(
        address tokenIn_,
        address tokenOut_,
        uint256 amountIn_
    ) external view override(IPriceProvider, PriceProvider) returns (uint256 _amountOut, uint256 _lastUpdatedAt) {
        return quote(tokenIn_, tokenOut_, defaultPoolFee, defaultTwapPeriod, amountIn_);
    }

    /// @inheritdoc IUniswapV3PriceProvider
    function quote(
        address tokenIn_,
        address tokenOut_,
        uint32 twapPeriod_,
        uint256 amountIn_
    ) external view override returns (uint256 _amountOut, uint256 _lastUpdatedAt) {
        return quote(tokenIn_, tokenOut_, defaultPoolFee, twapPeriod_, amountIn_);
    }

    /// @inheritdoc IUniswapV3PriceProvider
    function quote(
        address tokenIn_,
        address tokenOut_,
        uint24 poolFee_,
        uint256 amountIn_
    ) external view override returns (uint256 _amountOut, uint256 _lastUpdatedAt) {
        return quote(tokenIn_, tokenOut_, poolFee_, defaultTwapPeriod, amountIn_);
    }

    /// @inheritdoc IUniswapV3PriceProvider
    function quote(
        address tokenIn_,
        address tokenOut_,
        uint24 poolFee_,
        uint32 twapPeriod_,
        uint256 amountIn_
    ) public view override returns (uint256 _amountOut, uint256 _lastUpdatedAt) {
        if (tokenIn_ == tokenOut_) {
            return (amountIn_, block.timestamp);
        }

        if (tokenIn_ == crossPoolOracle.nativeToken()) {
            _amountOut = crossPoolOracle.ethToAsset(amountIn_, tokenOut_, poolFee_, twapPeriod_);
        } else if (tokenOut_ == crossPoolOracle.nativeToken()) {
            _amountOut = crossPoolOracle.assetToEth(tokenIn_, amountIn_, poolFee_, twapPeriod_);
        } else {
            _amountOut = crossPoolOracle.assetToAsset(tokenIn_, amountIn_, tokenOut_, poolFee_, twapPeriod_);
        }
        _lastUpdatedAt = block.timestamp;
    }

    /// @inheritdoc IUniswapV3PriceProvider
    function quoteTokenToUsd(
        address token_,
        uint256 amountIn_,
        uint24 poolFee_
    ) public view override returns (uint256 _amountOut, uint256 _lastUpdatedAt) {
        return quoteTokenToUsd(token_, amountIn_, poolFee_, defaultTwapPeriod);
    }

    /// @inheritdoc IUniswapV3PriceProvider
    function quoteTokenToUsd(
        address token_,
        uint256 amountIn_,
        uint32 twapPeriod_
    ) public view override returns (uint256 _amountOut, uint256 _lastUpdatedAt) {
        return quoteTokenToUsd(token_, amountIn_, defaultPoolFee, twapPeriod_);
    }

    /// @inheritdoc IUniswapV3PriceProvider
    function quoteTokenToUsd(
        address token_,
        uint256 amountIn_,
        uint24 poolFee_,
        uint32 twapPeriod_
    ) public view override returns (uint256 _amountOut, uint256 _lastUpdatedAt) {
        uint256 _price;
        (_price, _lastUpdatedAt) = getPriceInUsd(token_, poolFee_, twapPeriod_);
        _amountOut = (amountIn_ * _price) / 10**IERC20Metadata(token_).decimals();
    }

    /// @inheritdoc IUniswapV3PriceProvider
    function quoteUsdToToken(
        address token_,
        uint256 amountIn_,
        uint24 poolFee_
    ) public view override returns (uint256 _amountOut, uint256 _lastUpdatedAt) {
        return quoteUsdToToken(token_, amountIn_, poolFee_, defaultTwapPeriod);
    }

    /// @inheritdoc IUniswapV3PriceProvider
    function quoteUsdToToken(
        address token_,
        uint256 amountIn_,
        uint32 twapPeriod_
    ) public view override returns (uint256 _amountOut, uint256 _lastUpdatedAt) {
        return quoteUsdToToken(token_, amountIn_, defaultPoolFee, twapPeriod_);
    }

    /// @inheritdoc IUniswapV3PriceProvider
    function quoteUsdToToken(
        address token_,
        uint256 amountIn_,
        uint24 poolFee_,
        uint32 twapPeriod_
    ) public view override returns (uint256 _amountOut, uint256 _lastUpdatedAt) {
        uint256 _price;
        (_price, _lastUpdatedAt) = getPriceInUsd(token_, poolFee_, twapPeriod_);
        _amountOut = (amountIn_ * 10**IERC20Metadata(token_).decimals()) / _price;
    }

    /// @inheritdoc IUniswapV3PriceProvider
    function updateDefaultTwapPeriod(uint32 newDefaultTwapPeriod_) external onlyGovernor {
        emit DefaultTwapPeriodUpdated(defaultTwapPeriod, newDefaultTwapPeriod_);
        defaultTwapPeriod = newDefaultTwapPeriod_;
    }

    /// @inheritdoc IUniswapV3PriceProvider
    function updateDefaultPoolFee(uint24 newDefaultPoolFee_) external onlyGovernor {
        emit DefaultPoolFeeUpdated(defaultPoolFee, newDefaultPoolFee_);
        defaultPoolFee = newDefaultPoolFee_;
    }
}
