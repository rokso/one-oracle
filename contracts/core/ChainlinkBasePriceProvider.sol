// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "./ChainlinkPriceProvider.sol";

/**
 * @title Chainlink's price provider for optimism network
 */
contract ChainlinkBasePriceProvider is ChainlinkPriceProvider {
    constructor() {
        // optimism aggregators: https://docs.chain.link/data-feeds/price-feeds/addresses?network=base
        // Note: These are NOT all available aggregators, not adding them all to avoid too expensive deployment cost
        _setAggregator(0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913, AggregatorV3Interface(0x7e860098F58bBFC8648a4311b374B1D669a2bc6B)); // USDC
        _setAggregator(0x3932FBCB64859BA68cD3eA5B2a2694Fe1daF4F03, AggregatorV3Interface(0xCCADC697c55bbB68dc5bCdf8d3CBe83CdD4E071E)); // WBTC
        _setAggregator(0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb, AggregatorV3Interface(0x591e79239a7d679378eC8c847e5038150364C78F)); // DAI
        _setAggregator(0x4200000000000000000000000000000000000006, AggregatorV3Interface(0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70)); // WETH               
    }
}
