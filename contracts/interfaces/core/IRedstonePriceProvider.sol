// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "./IPriceProvider.sol";

interface IRedstonePriceProvider is IPriceProvider {
    /**
     * @notice Update feed id
     */
    function updateFeedId(bytes32 feedId_, address token_) external;
}
