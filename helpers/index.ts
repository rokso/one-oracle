import {Addresses} from './address'

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

export {Addresses, Provider}
