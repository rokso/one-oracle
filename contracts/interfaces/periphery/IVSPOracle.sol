// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../core/IPriceProvidersAggregator.sol";
import "./IUSDOracle.sol";

interface IVSPOracle is IUSDOracle {
    /**
     * @notice For Dex price provider, we may want to use stable token as USD token to get price in USD.
     * @dev Allow to set 0x0 in case we don't want to support USD price from UniV2 and UniV3.
     * @param usdEquivalentToken_ Preferred stable token address
     */
    function setUSDEquivalentToken(address usdEquivalentToken_) external;

    /**
     * @notice Update providers aggregator
     * @param providersAggregator_ The providers aggregator contract
     */
    function updateProvidersAggregator(IPriceProvidersAggregator providersAggregator_) external;
}
