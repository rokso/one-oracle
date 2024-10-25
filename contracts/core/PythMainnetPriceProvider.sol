// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "./PythPriceProvider.sol";

/**
 * @title Pyth's price provider with Mainnet pre-setup
 */
contract PythMainnetPriceProvider is PythPriceProvider {
    constructor(IPyth pyth_) PythPriceProvider(pyth_) {
        feedIds[0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48] = 0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a; // USDC
        feedIds[0x6B175474E89094C44Da98b954EedeAC495271d0F] = 0xb0948a5e5313200c632b51bb5ca32f6de0d36e9950a942d19751e833f70dabfd; // DAI
        feedIds[0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2] = 0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace; // WETH
        feedIds[0x64351fC9810aDAd17A690E4e1717Df5e7e085160] = 0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace; // msETH
        feedIds[0x853d955aCEf822Db058eb8505911ED77F175b99e] = 0xc3d5d8d6d17081b3d0bbca6e2fa3a6704bb9a9561d9f9e1dc52db47629f862ad; // FRAX
        feedIds[0xac3E018457B222d93114458476f3E3416Abbe38F] = 0xb2bb466ff5386a63c18aa7c3bc953cb540c755e2aa99dafb13bc4c177692bed0; // sfrxETH
        feedIds[0xae78736Cd615f374D3085123A210448E74Fc6393] = 0xa0255134973f4fdf2f8f7808354274a3b1ebc6ee438be898d045e8b56ba1fe13; // rETH
        feedIds[0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84] = 0x846ae1bdb6300b817cee5fdee2a6da192775030db5615b94a465f53bd40850b5; // stETH
        feedIds[0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599] = 0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43; // WBTC
        feedIds[0x8b4F8aD3801B4015Dea6DA1D36f063Cbf4e231c7] = 0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43; // msBTC
        feedIds[0xBe9895146f7AF43049ca1c1AE358B0541Ea49704] = 0x15ecddd26d49e1a8f1de9376ebebc03916ede873447c1255d2d5891b92ce5717; // cbETH
    }
}
