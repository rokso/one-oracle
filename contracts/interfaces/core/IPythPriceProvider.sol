// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "./IPriceProvider.sol";

interface IPythPriceProvider is IPriceProvider {
    /**
     * @notice Update token's feed id
     */
    function updateFeedId(address token_, bytes32 feedId_) external;
}
