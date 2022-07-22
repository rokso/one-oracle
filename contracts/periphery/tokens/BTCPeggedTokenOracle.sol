// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/utils/math/SafeCast.sol";
import "../../interfaces/periphery/ITokenOracle.sol";

/**
 * @title Oracle for `CTokens`
 */
contract BTCPeggedTokenOracle is ITokenOracle {
    using SafeCast for int256;

    /// @notice Chainlink BTC/USD aggregator heart beat
    uint256 public immutable heartBeat;

    /// @notice Chainlink BTC/USD aggregator
    AggregatorV3Interface public immutable btcAggregator;

    constructor(AggregatorV3Interface btcAggregator_, uint256 heartBeat_) {
        btcAggregator = btcAggregator_;
        heartBeat = heartBeat_;
    }

    /// @inheritdoc ITokenOracle
    function getPriceInUsd(address) external view override returns (uint256 _priceInUsd) {
        (, int256 _price, , uint256 _lastUpdatedAt, ) = btcAggregator.latestRoundData();
        require(_lastUpdatedAt > block.timestamp - heartBeat, "stale-price");
        return _price.toUint256() * 1e10; // To 18 decimals
    }
}
