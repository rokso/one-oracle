// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "@openzeppelin/contracts/utils/math/SafeCast.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "../../interfaces/periphery/IOracle.sol";
import "../../interfaces/periphery/ITokenOracle.sol";
import "../../features/UsingStalePeriod.sol";

/**
 * @title Redstone Oracle for token with USDC-only price feed
 * @dev Redstone uses the same interface but asset decimals aren't the same as Chainlink
 */
contract RedstoneUsdcOnlyTokenOracle is ITokenOracle, UsingStalePeriod {
    using SafeCast for int256;

    uint256 constant USDC_FEED_DECIMALS = 8;

    address public immutable USDC;

    mapping(address => AggregatorV3Interface) public usdcFeedOf;

    event UsdcFeedUpdated(address indexed token, AggregatorV3Interface usdcFeed);

    constructor(address usdc_) UsingStalePeriod(24 hours) {
        USDC = usdc_;
    }

    /// @inheritdoc ITokenOracle
    function getPriceInUsd(address token_) external view override returns (uint256 _priceInUsd) {
        // TOKEN/USDC price from Redstone
        (, int256 _price, , uint256 _lastUpdatedAt, ) = usdcFeedOf[token_].latestRoundData();
        require(_price > 0 && !_priceIsStale(token_, _lastUpdatedAt), "price-invalid");
        uint256 _priceInUsdc = _price.toUint256();

        // USDC/USD price from Redstone
        uint256 _usdcPriceInUsd = IOracle(msg.sender).getPriceInUsd(USDC);

        // TOKEN/USD price
        return (_priceInUsdc * _usdcPriceInUsd) / 10 ** USDC_FEED_DECIMALS;
    }

    /**
     * @notice Update default stale period
     */
    function updateUsdcFeed(address token_, AggregatorV3Interface usdcFeed_) external onlyGovernor {
        emit UsdcFeedUpdated(token_, usdcFeed_);
        usdcFeedOf[token_] = usdcFeed_;
    }
}
