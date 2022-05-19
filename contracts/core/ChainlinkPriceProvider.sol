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
    using SafeCast for int256;

    uint256 public constant CHAINLINK_DECIMALS = 8;
    uint256 public constant USD_DECIMALS = 18;
    uint256 public constant TO_SCALE = 10**(USD_DECIMALS - CHAINLINK_DECIMALS);

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
     * @notice Get token's price
     * @param token_ The token
     * @return The price (18 decimals) and its timestamp
     */
    function _getUsdPriceOfAsset(address token_) internal view virtual returns (uint256, uint256) {
        AggregatorV3Interface _aggregator = aggregators[token_];
        require(address(_aggregator) != address(0), "token-without-aggregator");
        (, int256 _price, , uint256 _lastUpdatedAt, ) = _aggregator.latestRoundData();
        return (_price.toUint256() * TO_SCALE, _lastUpdatedAt);
    }

    /**
     * @notice Update token's aggregator
     */
    function updateAggregator(address token_, AggregatorV3Interface aggregator_) external onlyGovernor {
        require(token_ != address(0), "token-is-null");
        AggregatorV3Interface _current = aggregators[token_];
        require(aggregator_ != _current, "same-as-current");
        _setAggregator(token_, aggregator_);
        emit AggregatorUpdated(_current, aggregator_);
    }

    function _setAggregator(address token_, AggregatorV3Interface aggregator_) internal {
        require(address(aggregator_) == address(0) || aggregator_.decimals() == CHAINLINK_DECIMALS, "invalid-decimals");
        aggregators[token_] = aggregator_;
    }
}
