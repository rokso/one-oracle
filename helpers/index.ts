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
}

// Note: See `contracts/libraries/DataTypes.sol`
enum SwapType {
  EXACT_INPUT = 0,
  EXACT_OUTPUT = 1,
}

export {Address, Provider, ExchangeType, SwapType}
