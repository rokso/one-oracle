// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "@openzeppelin/contracts/utils/math/SafeCast.sol";
import "../access/Governable.sol";
import "../dependencies/@umb-network/IChain.sol";
import "../dependencies/@umb-network/IRegistry.sol";
import "../dependencies/@umb-network/lib/ValueDecoder.sol";
import "../dependencies/@umb-network/interfaces/IDatumReceiver.sol";

/**
 *  @title Datum Receiver example implementation
 */
contract UmbrellaDatumReceiver is IDatumReceiver, Governable {
    using ValueDecoder for bytes32;
    using SafeCast for uint256;

    bytes32 public constant DATUM_REGISTRY = bytes32("DatumRegistry");
    bytes32 public constant CHAIN = bytes32("Chain");

    struct PriceData {
        uint224 priceInUsd;
        uint32 lastUpdatedAt;
    }

    struct UpdatePolicy {
        uint128 heartbeatTimestamp; // must update at least once on every heartbeat
        uint128 deviationThreshold; // must update if deviation reaches threshold (% in 18-decimals)
    }

    /// @notice Parameters used to accept new prices
    UpdatePolicy public updatePolicy;

    /// @notice Umbrella registry contract
    IRegistry public immutable registry;

    /// @notice Mapping of latest price of key
    mapping(bytes32 => PriceData) public latestPriceOf;

    /// @notice Emitted when heartbeat is updated
    event HeartbeatTimestampUpdated(uint128 oldHeartbeatTimestamp, uint128 newHeartbeatTimestamp);

    /// @notice Emitted when deviation threshold is updated
    event DeviationThresholdUpdated(uint128 oldDeviationThreshold, uint128 newDeviationThreshold);

    constructor(
        IRegistry registry_,
        uint128 heartbeatTimestamp_,
        uint128 deviationThreshold_
    ) {
        require(address(registry_) != address(0), "registry-is-null");
        registry = registry_;
        updatePolicy = UpdatePolicy({heartbeatTimestamp: heartbeatTimestamp_, deviationThreshold: deviationThreshold_});
    }

    /// @inheritdoc IDatumReceiver
    function approvePallet(Pallet calldata pallet_) external view virtual override returns (bool) {
        IChain.Block memory _block = IChain(registry.getAddress(CHAIN)).blocks(pallet_.blockId);

        UpdatePolicy memory _updatePolicy = updatePolicy;
        PriceData memory _priceData = latestPriceOf[pallet_.key];

        if (_block.dataTimestamp > _priceData.lastUpdatedAt + _updatePolicy.heartbeatTimestamp) {
            return true;
        }

        uint224 _latestPrice = _priceData.priceInUsd;
        uint224 _newPrice = pallet_.value.toUint().toUint224();
        uint256 _deviation = _latestPrice > _newPrice
            ? ((_latestPrice - _newPrice) * 1e18) / _latestPrice
            : ((_newPrice - _latestPrice) * 1e18) / _newPrice;

        require(_deviation > _updatePolicy.deviationThreshold, "deviation-is-not-enough");

        return true;
    }

    /// @inheritdoc IDatumReceiver
    function receivePallet(Pallet calldata pallet_) external virtual override {
        require(_msgSender() == registry.getAddress(DATUM_REGISTRY), "not-datum-registry");

        uint32 _palletTimestamp = IChain(registry.getAddress(CHAIN)).blocks(pallet_.blockId).dataTimestamp;

        require(latestPriceOf[pallet_.key].lastUpdatedAt < _palletTimestamp, "update-already-received");

        latestPriceOf[pallet_.key] = PriceData({
            lastUpdatedAt: _palletTimestamp,
            priceInUsd: pallet_.value.toUint().toUint224()
        });
    }

    /// @notice Updates heartbeat
    function updateHeartbeatTimestamp(uint128 heartbeatTimestamp_) external onlyGovernor {
        emit HeartbeatTimestampUpdated(updatePolicy.heartbeatTimestamp, heartbeatTimestamp_);
        updatePolicy.heartbeatTimestamp = heartbeatTimestamp_;
    }

    /// @notice Updates deviation threshold
    function updateDeviationThreshold(uint128 deviationThreshold_) external onlyGovernor {
        emit DeviationThresholdUpdated(updatePolicy.deviationThreshold, deviationThreshold_);
        updatePolicy.deviationThreshold = deviationThreshold_;
    }
}
