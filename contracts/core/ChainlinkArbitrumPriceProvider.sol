// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "./ChainlinkPriceProvider.sol";

/**
 * @title ChainLink's price provider for Arbitrum network
 */
contract ChainlinkArbitrumPriceProvider is ChainlinkPriceProvider {
    constructor() {
        // Arbitrum's aggregators: https://docs.chain.link/docs/arbitrum-price-feeds/
        _setAggregator(0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f, AggregatorV3Interface(0x6ce185860a4963106506C203335A2910413708e9)); // WBTC
        _setAggregator(0x11cDb42B0EB46D95f990BeDD4695A6e3fA034978, AggregatorV3Interface(0xaebDA2c976cfd1eE1977Eac079B4382acb849325)); // CRV
        _setAggregator(0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1, AggregatorV3Interface(0xc5C8E77B397E531B8EC06BFb0048328B30E9eCfB)); // DAI
        _setAggregator(0x69Eb4FA4a2fbd498C257C57Ea8b7655a2559A581, AggregatorV3Interface(0xA33a06c119EC08F92735F9ccA37e07Af08C4f281)); // DODO
        _setAggregator(0x82aF49447D8a07e3bd95BD0d56f35241523fBab1, AggregatorV3Interface(0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612)); // WETH
        _setAggregator(0x17FC002b466eEc40DaE837Fc4bE5c67993ddBd6F, AggregatorV3Interface(0x0809E3d38d1B4214958faf06D8b1B1a2b73f2ab8)); // FRAX
        _setAggregator(0x9d2F299715D94d8A7E6F5eaa8E654E8c74a988A7, AggregatorV3Interface(0x36a121448D74Fa81450c992A1a44B9b7377CD3a5)); // FXS
        _setAggregator(0xf97f4df75117a78c1A5a0DBb814Af92458539FB4, AggregatorV3Interface(0x86E53CF1B870786351Da77A57575e79CB55812CB)); // LINK
        _setAggregator(0x1A4dA80967373fd929961e976b4b53ceeC063a15, AggregatorV3Interface(0x81a065E74943A8B6380C23f8b440Aea1Dc3530cA)); // LUNA
        _setAggregator(0xFEa7a6a0B346362BF88A9e4A88416B77a57D6c2A, AggregatorV3Interface(0x87121F6c9A9F6E90E59591E4Cf4804873f54A95b)); // MIM
        _setAggregator(0x3E6648C5a70A150A88bCE65F4aD4d506Fe15d2AF, AggregatorV3Interface(0x383b3624478124697BEF675F07cA37570b73992f)); // SPELL
        _setAggregator(0xd4d42F0b6DEF4CE0383636770eF773390d85c61A, AggregatorV3Interface(0xb2A8BA74cbca38508BA1632761b56C897060147C)); // SUSHI
        _setAggregator(0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0, AggregatorV3Interface(0x9C917083fDb403ab5ADbEC26Ee294f6EcAda2720)); // UNI
        _setAggregator(0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8, AggregatorV3Interface(0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3)); // USDC
        _setAggregator(0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9, AggregatorV3Interface(0x3f3f5dF88dC9F13eac63DF89EC16ef6e7E25DdE7)); // USDT
        _setAggregator(0x82e3A8F066a6989666b031d916c43672085b1582, AggregatorV3Interface(0x745Ab5b69E01E2BE1104Ca84937Bb71f96f5fB21)); // YFI
    }
}
