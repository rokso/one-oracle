/* eslint-disable camelcase */
import {parseEther} from '.'

/**
 * This file centralizes all prices to make it easier to update them when changing fork blocks
 * Unlike other use cases, it's important to fix block when forking to having precise prices assertions
 */
const Quote = {
  base: {
    ETH_USD: parseEther('1,878'),
  },
  mainnet: {
    BTC_USD: parseEther('84,075'),
    ETH_USD: parseEther('1,874'),
    DOGE_USD: parseEther('0.077'),
    BTC_ETH: parseEther('44.86'),
    USD_ETH: parseEther('0.00053'),
    USD_BTC: parseEther('0.00002'),
    VSP_USD: parseEther('0.1750'),
    CETH_USD: parseEther('37'),
    CDAI_USD: parseEther('0.024'),
    CURVE_TRIPOOL_LP_USD: parseEther('1.032'),
    CURVE_SBTC_LP_USD: parseEther('85,874'),
    CURVE_MIM_3CRV_LP_USD: parseEther('1.015'),
    CURVE_D3POOL_LP_USD: parseEther('0.9686'),
    CURVE_FRAX_3CRV_LP_USD: parseEther('1.00'),
    CURVE_IBBTC_LP_USD: parseEther('85,485.43'),
    CURVE_AAVE_LP_USD: parseEther('1.2212'),
    CURVE_COMPOUND_LP_USD: parseEther('1.222'),
    CURVE_USDT_LP_USD: parseEther('3.135'),
    CURVE_BUSD_LP_USD: parseEther('0.0219'),
    CURVE_PAX_LP_USD: parseEther('0.0754'),
    CURVE_Y_LP_USD: parseEther('0.012'),
    CURVE_DOLA_3CRV_LP_USD: parseEther('1.02'),
    CURVE_DOLA_FRAXBP_LP_USD: parseEther('1.02'),
    CURVE_GUSD_LP_USD: parseEther('1.04'),
    CURVE_REN_LP_USD: parseEther('86,196.80'),
    CURVE_FRAX_USDC_LP_USD: parseEther('1.00'),
    CURVE_DOLA_FRAX_PYUSD_LP_USD: parseEther('1.00'),
    UNIV2_ETH_DAI_LP_USD: parseEther('176'),
    UNIV2_WBTC_USDC_LP_USD: parseEther('105,780,783,552,029'),
    UNIV2_ETH_WBTC_LP_USD: parseEther('3,249,771,540'),
    vaUSDC_USD: parseEther('1.23'),
    vaDAI_USD: parseEther('1.13'),
    vaFRAX_USD: parseEther('1.28'),
    vaETH_USD: parseEther('1,944'),
    vastETH_USD: parseEther('2,134'),
    varETH_USD: parseEther('2,195'),
    vaWBTC_USD: parseEther('87,285'),
    vaLINK_USD: parseEther('14.54'),
    vacbETH_USD: parseEther('2,122'),
  },
  optimism: {
    ETH_USD: parseEther('1,844'),
    USDC_USD: parseEther('1'),
    DAI_USD: parseEther('1'),
    OP_USD: parseEther('0.82'),
    vaUSDC_USD: parseEther('1.1'),
    vaETH_USD: parseEther('1,976'),
    vastETH_USD: parseEther('2,202'),
    vaOP_USD: parseEther('0.86'),
  },
  swell: {
    ETH_USD: parseEther('3,937'),
  },
  hemi: {
    ETH_USD: parseEther('2,012'),
    USDC_USD: parseEther('1'),
    USDT_USD: parseEther('0.99'),
    BTC_USD: parseEther('79,909'),
  },
}
export default Quote
