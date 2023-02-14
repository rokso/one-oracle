// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "./ChainlinkPriceProvider.sol";

/**
 * @title Chainlink's price provider for optimism network
 */
contract ChainlinkOptimismPriceProvider is ChainlinkPriceProvider {
    constructor() {
        // optimism aggregators: https://docs.chain.link/data-feeds/price-feeds/addresses?network=optimism
        // Note: These are NOT all available aggregators, not adding them all to avoid too expensive deployment cost
        _setAggregator(0x7F5c764cBc14f9669B88837ca1490cCa17c31607, AggregatorV3Interface(0x16a9FA2FDa030272Ce99B29CF780dFA30361E0f3)); // USDC
        _setAggregator(0x68f180fcCe6836688e9084f035309E29Bf0A2095, AggregatorV3Interface(0x718A5788b89454aAE3A028AE9c111A29Be6c2a6F)); // WBTC
        _setAggregator(0x4200000000000000000000000000000000000042, AggregatorV3Interface(0x0D276FC14719f9292D5C1eA2198673d1f4269246)); // OP
        _setAggregator(0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1, AggregatorV3Interface(0x8dBa75e83DA73cc766A7e5a0ee71F656BAb470d6)); // DAI
        _setAggregator(0x4200000000000000000000000000000000000006, AggregatorV3Interface(0x13e3Ee699D1909E989722E753853AE30b17e08c5)); // WETH               
    }
}
