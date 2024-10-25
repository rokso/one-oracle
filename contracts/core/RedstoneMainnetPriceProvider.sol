// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "./RedstonePriceProvider.sol";

/**
 * @title Redstone's price provider with Mainnet pre-setup
 */
contract RedstoneMainnetPriceProvider is RedstonePriceProvider {
    constructor() {
        feeds[bytes32("USDC")].push(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48);
        feeds[bytes32("DAI")].push(0x6B175474E89094C44Da98b954EedeAC495271d0F);
        feeds[bytes32("ETH")].push(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2); // WETH
        feeds[bytes32("ETH")].push(0x64351fC9810aDAd17A690E4e1717Df5e7e085160); // msETH
        feeds[bytes32("FRAX")].push(0x853d955aCEf822Db058eb8505911ED77F175b99e);
        feeds[bytes32("sfrxETH")].push(0xac3E018457B222d93114458476f3E3416Abbe38F);
        feeds[bytes32("rETH")].push(0xae78736Cd615f374D3085123A210448E74Fc6393);
        feeds[bytes32("stETH")].push(0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84);
        feeds[bytes32("BTC")].push(0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599); // WBTC
        feeds[bytes32("BTC")].push(0x8b4F8aD3801B4015Dea6DA1D36f063Cbf4e231c7); // msBTC
    }
}
