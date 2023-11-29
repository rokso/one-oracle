// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "@chainlink/contracts/src/v0.8/interfaces/FeedRegistryInterface.sol";
import "./ChainlinkPriceProvider.sol";
import "../libraries/OracleHelpers.sol";

/**
 * @title Chainlink's price provider for Mainnet network
 * @dev Not uses price feed in order to save gas
 */
contract ChainlinkMainnetPriceProvider is ChainlinkPriceProvider {
    constructor() {
        // Mainnet's aggregators: https://docs.chain.link/docs/ethereum-addresses/
        // Note: These are NOT all available aggregators, not adding them all to avoid too expensive deployment cost
        _setAggregator(0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9, AggregatorV3Interface(0x547a514d5e3769680Ce22B2361c10Ea13619e8a9)); // AAVE
        _setAggregator(0x85f138bfEE4ef8e540890CFb48F620571d67Eda3, AggregatorV3Interface(0xFF3EEb22B5E3dE6e705b44749C2559d704923FD7)); // WAVAX
        _setAggregator(0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599, AggregatorV3Interface(0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c)); // WBTC
        _setAggregator(0xc00e94Cb662C3520282E6f5717214004A7f26888, AggregatorV3Interface(0xdbd020CAeF83eFd542f4De03e3cF0C28A4428bd5)); // COMP
        _setAggregator(0xD533a949740bb3306d119CC777fa900bA034cd52, AggregatorV3Interface(0xCd627aA160A6fA45Eb793D19Ef54f5062F20f33f)); // CRV
        _setAggregator(0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B, AggregatorV3Interface(0xd962fC30A72A84cE50161031391756Bf2876Af5D)); // CVX
        _setAggregator(0x6B175474E89094C44Da98b954EedeAC495271d0F, AggregatorV3Interface(0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9)); // DAI
        _setAggregator(0x1494CA1F11D487c2bBe4543E90080AeBa4BA3C2b, AggregatorV3Interface(0xD2A593BF7594aCE1faD597adb697b5645d5edDB2)); // DPI
        _setAggregator(0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72, AggregatorV3Interface(0x5C00128d4d1c2F4f652C267d7bcdD7aC99C16E16)); // ENS
        _setAggregator(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2, AggregatorV3Interface(0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419)); // WETH
        _setAggregator(0x853d955aCEf822Db058eb8505911ED77F175b99e, AggregatorV3Interface(0xB9E1E3A9feFf48998E45Fa90847ed4D467E8BcfD)); // FRAX
        _setAggregator(0xc944E90C64B2c07662A292be6244BDf05Cda44a7, AggregatorV3Interface(0x86cF33a451dE9dc61a2862FD94FF4ad4Bd65A5d2)); // GRT
        _setAggregator(0x056Fd409E1d7A124BD7017459dFEa2F387b6d5Cd, AggregatorV3Interface(0xa89f5d2365ce98B3cD68012b6f503ab1416245Fc)); // GUSD
        _setAggregator(0x514910771AF9Ca656af840dff83E8264EcF986CA, AggregatorV3Interface(0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c)); // LINK
        _setAggregator(0x7c9f4C87d911613Fe9ca58b579f737911AAD2D43, AggregatorV3Interface(0x7bAC85A8a13A4BcD8abb3eB7d6b4d632c5a57676)); // WMATIC
        _setAggregator(0x99D8a9C45b2ecA8864373A26D1459e3Dff1e17F3, AggregatorV3Interface(0x7A364e8770418566e3eb2001A96116E6138Eb32F)); // MIM
        _setAggregator(0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2, AggregatorV3Interface(0xec1D1B3b0443256cc3860e24a46F108e699484Aa)); // MKR
        _setAggregator(0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F, AggregatorV3Interface(0xDC3EA94CD0AC27d9A86C180091e7f78C683d3699)); // SNX
        _setAggregator(0x090185f2135308BaD17527004364eBcC2D37e5F6, AggregatorV3Interface(0x8c110B94C5f1d347fAcF5E1E938AB2db60E3c9a8)); // SPELL
        _setAggregator(0x6B3595068778DD592e39A122f4f5a5cF09C90fE2, AggregatorV3Interface(0xCc70F09A6CC17553b2E31954cD36E4A2d89501f7)); // SUSHI
        _setAggregator(0x0000000000085d4780B73119b644AE5ecd22b376, AggregatorV3Interface(0xec746eCF986E2927Abd291a2A1716c940100f8Ba)); // TUSD
        _setAggregator(0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984, AggregatorV3Interface(0x553303d460EE0afB37EdFf9bE42922D8FF63220e)); // UNI
        _setAggregator(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48, AggregatorV3Interface(0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6)); // USDC
        _setAggregator(0xdAC17F958D2ee523a2206206994597C13D831ec7, AggregatorV3Interface(0x3E7d1eAB13ad0104d2750B8863b489D65364e32D)); // USDT
        _setAggregator(0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e, AggregatorV3Interface(0xA027702dbb89fbd58938e4324ac03B58d812b0E1)); // YFI
    }
}
