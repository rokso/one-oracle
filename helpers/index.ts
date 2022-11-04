import Address from './address'

// Note: See `contracts/libraries/DataTypes.sol`
enum Provider {
  NONE = 0,
  CHAINLINK = 1,
  UNISWAP_V3 = 2,
  UNISWAP_V2 = 3,
  SUSHISWAP = 4,
  TRADERJOE = 5,
  PANGOLIN = 6,
  QUICKSWAP = 7,
  UMBRELLA_FIRST_CLASS = 8,
  UMBRELLA_PASSPORT = 9,
  FLUX = 10,
}

// Note: See `contracts/libraries/DataTypes.sol`
enum ExchangeType {
  UNISWAP_V2 = 0,
  SUSHISWAP = 1,
  TRADERJOE = 2,
  PANGOLIN = 3,
  QUICKSWAP = 4,
  UNISWAP_V3 = 5,
  PANCAKE_SWAP = 6,
  CURVE = 7,
}

// Note: See `contracts/libraries/DataTypes.sol`
enum SwapType {
  EXACT_INPUT = 0,
  EXACT_OUTPUT = 1,
}

const InitCodeHash = {
  [Address.mainnet.UNISWAP_V2_FACTORY_ADDRESS]: '0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f',
  [Address.mainnet.SUSHISWAP_FACTORY_ADDRESS]: '0xe18a34eb0e04b04f7a0ac29a6e80748dca96319b42c54d679cb821dca90c6303',
  [Address.avalanche.TRADERJOE_FACTORY_ADDRESS]: '0x0bbca9af0511ad1a1da383135cf3a8d2ac620e549ef9f6ae3a4c33c2fed0af91',
  [Address.avalanche.PANGOLIN_FACTORY_ADDRESS]: '0x40231f6b438bce0797c9ada29b718a87ea0a5cea3fe9a771abdd76bd41a3e545',
  [Address.polygon.QUICKSWAP_FACTORY_ADDRESS]: '0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f',
  [Address.polygon.SUSHISWAP_FACTORY_ADDRESS]: '0xe18a34eb0e04b04f7a0ac29a6e80748dca96319b42c54d679cb821dca90c6303',
  [Address.bsc.SUSHISWAP_FACTORY_ADDRESS]: '0xe18a34eb0e04b04f7a0ac29a6e80748dca96319b42c54d679cb821dca90c6303',
  [Address.bsc.PANCAKE_SWAP_FACTORY_ADDRESS]: '0x00fb7f630766e6a796048ea87d01acd3068e8ff67d078148a3fa3f4a84f69bd5',
}

export {Address, Provider, ExchangeType, SwapType, InitCodeHash}
