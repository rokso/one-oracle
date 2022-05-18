// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../core/IPriceProvidersAggregator.sol";
import "./IUSDOracle.sol";

interface IVSPOracle is IUSDOracle {
    /**
     * @notice Update providers aggregator
     * @param providersAggregator_ The providers aggregator contract
     */
    function updateProvidersAggregator(IPriceProvidersAggregator providersAggregator_) external;
}
