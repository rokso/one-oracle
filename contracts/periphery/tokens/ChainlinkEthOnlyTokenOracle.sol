// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "@openzeppelin/contracts/utils/math/SafeCast.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "../../interfaces/periphery/IOracle.sol";
import "../../interfaces/periphery/ITokenOracle.sol";
import "../../features/UsingStalePeriod.sol";

/**
 * @title Chainlink Oracle for token with ETH-only price feed
 */
contract ChainlinkEthOnlyTokenOracle is ITokenOracle, UsingStalePeriod {
    using SafeCast for int256;

    address public constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

    mapping(address => AggregatorV3Interface) public ethFeedOf;

    event EthFeedUpdated(address indexed token, AggregatorV3Interface ethFeed);

    constructor() UsingStalePeriod(24 hours) {}

    /// @inheritdoc ITokenOracle
    function getPriceInUsd(address token_) external view override returns (uint256 _priceInUsd) {
        // TOKEN/ETH price from Chainlink
        (, int256 _price, , uint256 _lastUpdatedAt, ) = ethFeedOf[token_].latestRoundData();
        require(_price > 0 && !_priceIsStale(token_, _lastUpdatedAt), "price-invalid");
        uint256 _priceInEth = _price.toUint256();

        // ETH/USD price from Chainlink
        uint256 _ethPriceInUsd = IOracle(msg.sender).getPriceInUsd(WETH);

        // TOKEN/USD price
        return (_priceInEth * _ethPriceInUsd) / (1e18);
    }

    /**
     * @notice Update default stale period
     */
    function updateEthFeed(address token_, AggregatorV3Interface ethFeed_) external onlyGovernor {
        emit EthFeedUpdated(token_, ethFeed_);
        ethFeedOf[token_] = ethFeed_;
    }
}
