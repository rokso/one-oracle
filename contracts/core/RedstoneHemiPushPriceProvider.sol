// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "./ChainlinkPriceProvider.sol";

/**
 * @title Redstone's push price provider for Hemi network. Redstone push price feed is 100% compatible with Chainlink.
 */
contract RedstoneHemiPushPriceProvider is ChainlinkPriceProvider {
    constructor() {
        _setAggregator(0x824D8FcDC36E81618377D140BEC12c3B7E4e4cbA, AggregatorV3Interface(0x31a36CdF4465ba61ce78F5CDbA26FDF8ec361803)); // USDC
        _setAggregator(0xbbA60da06c2c5424f03f7434542280FCAd453d10, AggregatorV3Interface(0xe8D9FbC10e00ecc9f0694617075fDAF657a76FB2)); // USDT
        _setAggregator(0x03C7054BCB39f7b2e5B2c7AcB37583e32D70Cfa3, AggregatorV3Interface(0xE23eCA12D7D2ED3829499556F6dCE06642AFd990)); // WBTC
        _setAggregator(0x4200000000000000000000000000000000000006, AggregatorV3Interface(0xb9D0073aCb296719C26a8BF156e4b599174fe1d5)); // WETH
    }
}
