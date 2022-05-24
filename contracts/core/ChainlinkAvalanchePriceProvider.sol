// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "./ChainlinkPriceProvider.sol";

/**
 * @title ChainLink's price provider for Avalanche network
 */
contract ChainlinkAvalanchePriceProvider is ChainlinkPriceProvider {
    constructor() {
        // Avalanche's aggregators: https://docs.chain.link/docs/avalanche-price-feeds/
        _setAggregator(0x63a72806098Bd3D9520cC43356dD78afe5D386D9, AggregatorV3Interface(0x3CA13391E9fb38a75330fb28f8cc2eB3D9ceceED)); // AAVE.e
        _setAggregator(0x2147EFFF675e4A4eE1C2f918d181cDBd7a8E208f, AggregatorV3Interface(0x7B0ca9A6D03FE0467A31Ca850f5bcA51e027B3aF)); // ALPHA.e
        _setAggregator(0x027dbcA046ca156De9622cD1e2D907d375e53aa7, AggregatorV3Interface(0xcf667FB6Bd30c520A435391c50caDcDe15e5e12f)); // AMPL
        _setAggregator(0x19860CCB0A68fd4213aB9D8266F7bBf05A8dDe98, AggregatorV3Interface(0x827f8a0dC5c943F7524Dda178E2e7F275AAd743f)); // BUSD.e
        _setAggregator(0x249848BeCA43aC405b8102Ec90Dd5F22CA513c06, AggregatorV3Interface(0x7CF8A6090A9053B01F3DF4D4e6CfEdd8c90d9027)); // CRV.e
        _setAggregator(0xd586E7F844cEa2F87f50152665BCbc2C279D8d70, AggregatorV3Interface(0x51D7180edA2260cc4F6e4EebB82FEF5c3c2B8300)); // DAI.e
        _setAggregator(0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd, AggregatorV3Interface(0x02D35d3a8aC3e1626d3eE09A78Dd87286F5E8e3a)); // JOE
        _setAggregator(0x5947BB275c521040051D82396192181b413227A3, AggregatorV3Interface(0x49ccd9ca821EfEab2b98c60dC60F518E765EDe9a)); // LINK.e
        _setAggregator(0x130966628846BFd36ff31a822705796e8cb8C18D, AggregatorV3Interface(0x54EdAB30a7134A16a54218AE64C73e1DAf48a8Fb)); // MIM
        _setAggregator(0x8729438EB15e2C8B576fCc6AeCdA6A148776C0F5, AggregatorV3Interface(0x36E039e6391A5E7A7267650979fdf613f659be5D)); // QI
        _setAggregator(0xCE1bFFBD5374Dac86a2893119683F4911a2F7814, AggregatorV3Interface(0x4F3ddF9378a4865cf4f28BE51E10AECb83B7daeE)); // SPELL
        _setAggregator(0x37B608519F91f70F2EeB0e5Ed9AF4061722e4F76, AggregatorV3Interface(0x449A373A090d8A1e5F74c63Ef831Ceff39E94563)); // SUSHI.e
        _setAggregator(0x1C20E891Bab6b1727d14Da358FAe2984Ed9B59EB, AggregatorV3Interface(0x9Cf3Ef104A973b351B2c032AA6793c3A6F76b448)); // TUSD
        _setAggregator(0x8eBAf22B6F053dFFeaf46f4Dd9eFA95D89ba8580, AggregatorV3Interface(0x9a1372f9b1B71B3A5a72E092AE67E172dBd7Daaa)); // UNI.e
        _setAggregator(0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664, AggregatorV3Interface(0xF096872672F44d6EBA71458D74fe67F9a77a23B9)); // USDC.e
        _setAggregator(0xc7198437980c041c805A1EDcbA50c1Ce5db95118, AggregatorV3Interface(0xEBE676ee90Fe1112671f19b6B7459bC678B67e8a)); // USDT.e
        _setAggregator(0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7, AggregatorV3Interface(0x0A77230d17318075983913bC2145DB16C7366156)); // WAVAX
        _setAggregator(0x50b7545627a5162F82A992c33b87aDc75187B218, AggregatorV3Interface(0x2779D32d5166BAaa2B2b658333bA7e6Ec0C65743)); // WBTC.e
        _setAggregator(0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB, AggregatorV3Interface(0x976B3D034E162d8bD72D6b9C989d545b839003b0)); // WETH.e
        _setAggregator(0xd1c3f94DE7e5B45fa4eDBBA472491a9f4B166FC4, AggregatorV3Interface(0x4Cf57DC9028187b9DAaF773c8ecA941036989238)); // XAVA
        _setAggregator(0x9eAaC1B23d935365bD7b542Fe22cEEe2922f52dc, AggregatorV3Interface(0x28043B1Ebd41860B93EC1F1eC19560760B6dB556)); // YFI.e
    }
}
