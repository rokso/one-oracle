// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "@openzeppelin/contracts/utils/math/SafeCast.sol";
import "../dependencies/@umb-network/lib/ValueDecoder.sol";
import "./UmbrellaPriceProvider.sol";
import "../interfaces/core/IUmbrellaPassportPriceProvider.sol";

/**
 * @title Umbrella Passport's Datum receiver & Price provider
 * @dev Based on https://bscscan.com/address/0xd3e5Bf479BF8A2252D89D2990dDE2173869166D0#code
 * Important: This contract assumes that all pallets are USD prices (i.e. `XYZ-USD` quotes).
 */
contract UmbrellaPassportPriceProvider is IUmbrellaPassportPriceProvider, UmbrellaPriceProvider {
    using ValueDecoder for bytes32;
    using SafeCast for uint256;

    bytes32 private constant DATUM_REGISTRY = bytes32("DatumRegistry");

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
    ) UmbrellaPriceProvider(registry_) {
        updatePolicy = UpdatePolicy({heartbeatTimestamp: heartbeatTimestamp_, deviationThreshold: deviationThreshold_});
    }

    /// @inheritdoc IDatumReceiver
    function approvePallet(Pallet calldata pallet_) external view virtual override returns (bool) {
        IChain.Block memory _block = _chain().blocks(pallet_.blockId);

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

        require(_deviation > _updatePolicy.deviationThreshold, "did-not-match-conditions");

        return true;
    }

    /// @inheritdoc IDatumReceiver
    function receivePallet(Pallet calldata pallet_) external virtual override {
        require(msg.sender == registry.getAddress(DATUM_REGISTRY), "not-datum-registry");

        uint32 _palletTimestamp = _chain().blocks(pallet_.blockId).dataTimestamp;

        require(latestPriceOf[pallet_.key].lastUpdatedAt < _palletTimestamp, "update-already-received");

        latestPriceOf[pallet_.key] = PriceData({
            lastUpdatedAt: _palletTimestamp,
            priceInUsd: pallet_.value.toUint().toUint224()
        });
    }

    /// @inheritdoc IUmbrellaPassportPriceProvider
    function updateHeartbeatTimestamp(uint128 heartbeatTimestamp_) external onlyGovernor {
        emit HeartbeatTimestampUpdated(updatePolicy.heartbeatTimestamp, heartbeatTimestamp_);
        updatePolicy.heartbeatTimestamp = heartbeatTimestamp_;
    }

    /// @inheritdoc IUmbrellaPassportPriceProvider
    function updateDeviationThreshold(uint128 deviationThreshold_) external onlyGovernor {
        emit DeviationThresholdUpdated(updatePolicy.deviationThreshold, deviationThreshold_);
        updatePolicy.deviationThreshold = deviationThreshold_;
    }

    /**
     * @inheritdoc IPriceProvider
     * @dev Get the latest price between Chain (Firs Class Data) and Passport data
     */
    function getPriceInUsd(address token_)
        public
        view
        override(IPriceProvider, UmbrellaPriceProvider)
        returns (uint256 _priceInUsd, uint256 _lastUpdatedAt)
    {
        bytes32 _key = keyOfToken[token_];

        (_priceInUsd, _lastUpdatedAt) = _chain().getCurrentValue(_key);
        PriceData memory _priceData = latestPriceOf[_key];

        if (_priceData.lastUpdatedAt >= _lastUpdatedAt) {
            _priceInUsd = _priceData.priceInUsd;
            _lastUpdatedAt = _priceData.lastUpdatedAt;
        }

        require(_lastUpdatedAt > 0, "invalid-quote");
    }
}
