// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "./IPriceProvider.sol";

interface IFluxPriceProvider is IPriceProvider {
    /**
     * @notice Add an aggregator to the token
     */
    function addAggregator(address token_, address aggregator_) external;

    /**
     * @notice Remove an aggregator from the token
     */
    function removeAggregator(address token_, address aggregator_) external;
}
