// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/math/SafeCast.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "../interfaces/core/IChainlinkPriceProvider.sol";
import "../access/Governable.sol";

/**
 * @title ChainLink's price provider
 * @dev This contract wraps chainlink aggregators
 */
contract ChainlinkPriceProvider is IChainlinkPriceProvider, Governable {
    /**
     * @notice Used to convert 8-decimals from Chainlink to 18-decimals values
     */
    uint256 public constant TEN_DECIMALS = 1e10;

    /**
     * @notice Aggregators map (token => aggregator)
     */
    mapping(address => AggregatorV3Interface) public aggregators;

    /// Emitted when an aggregator is updated
    event AggregatorUpdated(AggregatorV3Interface oldAggregator, AggregatorV3Interface newAggregator);

    /// @inheritdoc IUSDPriceProvider
    function getPriceInUsd(address token_) public view override returns (uint256 _priceInUsd, uint256 _lastUpdatedAt) {
        return _getUsdPriceOfAsset(token_);
    }

    /// @inheritdoc IPriceProvider
    function quote(
        address tokenIn_,
        address tokenOut_,
        uint256 amountIn_
    ) external view override returns (uint256 _amountOut, uint256 _lastUpdatedAt) {
        (uint256 _amountInUsd, uint256 _lastUpdatedAt0) = quoteTokenToUsd(tokenIn_, amountIn_);
        (_amountOut, _lastUpdatedAt) = quoteUsdToToken(tokenOut_, _amountInUsd);
        _lastUpdatedAt = Math.min(_lastUpdatedAt0, _lastUpdatedAt);
    }

    /// @inheritdoc IUSDPriceProvider
    function quoteTokenToUsd(address token_, uint256 amountIn_)
        public
        view
        override
        returns (uint256 _amountOut, uint256 _lastUpdatedAt)
    {
        uint256 _price;
        (_price, _lastUpdatedAt) = _getUsdPriceOfAsset(token_);
        _amountOut = (amountIn_ * _price) / 10**IERC20Metadata(token_).decimals();
    }

    /// @inheritdoc IUSDPriceProvider
    function quoteUsdToToken(address token_, uint256 amountIn_)
        public
        view
        override
        returns (uint256 _amountOut, uint256 _lastUpdatedAt)
    {
        uint256 _price;
        (_price, _lastUpdatedAt) = _getUsdPriceOfAsset(token_);
        _amountOut = (amountIn_ * 10**IERC20Metadata(token_).decimals()) / _price;
    }

    /**
     * @notice Get token's aggregator
     * @param token_ The token to get aggregator from
     * @return _aggregator The aggregator
     */
    function _aggregatorOf(address token_) private view returns (AggregatorV3Interface _aggregator) {
        _aggregator = aggregators[token_];
        require(address(_aggregator) != address(0), "token-without-aggregator");
    }

    /**
     * @notice Get token's price
     * @param token_ The token
     * @return The price (18 decimals) and its timestamp
     */
    function _getUsdPriceOfAsset(address token_) internal view virtual returns (uint256, uint256) {
        (, int256 _price, , uint256 _lastUpdatedAt, ) = _aggregatorOf(token_).latestRoundData();
        return (SafeCast.toUint256(_price) * TEN_DECIMALS, _lastUpdatedAt);
    }

    /**
     * @notice Update token's aggregator
     */
    function updateAggregator(address token_, AggregatorV3Interface aggregator_) external onlyGovernor {
        require(token_ != address(0), "token-is-null");
        AggregatorV3Interface _current = aggregators[token_];
        require(aggregator_ != _current, "same-as-current");

        emit AggregatorUpdated(_current, aggregator_);

        aggregators[token_] = aggregator_;
    }
}
