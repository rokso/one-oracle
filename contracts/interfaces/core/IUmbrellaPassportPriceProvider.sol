// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "../../dependencies/@umb-network/interfaces/IDatumReceiver.sol";
import "./IUmbrellaPriceProvider.sol";

interface IUmbrellaPassportPriceProvider is IUmbrellaPriceProvider, IDatumReceiver {
    /**
     * @notice Updates heartbeat
     */
    function updateHeartbeatTimestamp(uint128 heartbeatTimestamp_) external;

    /**
     * @notice Updates deviation threshold
     */
    function updateDeviationThreshold(uint128 deviationThreshold_) external;
}
