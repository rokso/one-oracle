/* eslint-disable camelcase */
import {parseEther} from '.'

/**
 * This file centralizes all prices to make it easier to update them when changing fork blocks
 * Unlike other use cases, it's important to fix block when forking to having precise prices assertions
 */
const Quote = {
  base: {
    ETH_USD: parseEther('3,063'),
  },
  mainnet: {
    BTC_USD: parseEther('64,854'),
    ETH_USD: parseEther('2,559'),
    DOGE_USD: parseEther('0.077'),
    BTC_ETH: parseEther('25.3'),
    USD_ETH: parseEther('0.00039'),
    USD_BTC: parseEther('0.00002'),
    VSP_USD: parseEther('0.2643'),
    CETH_USD: parseEther('51'),
    CDAI_USD: parseEther('0.023'),
    CURVE_TRIPOOL_LP_USD: parseEther('1.032'),
    CURVE_SBTC_LP_USD: parseEther('66,233'),
    CURVE_MIM_3CRV_LP_USD: parseEther('1.014'),
    CURVE_D3POOL_LP_USD: parseEther('0.9686'),
    CURVE_FRAX_3CRV_LP_USD: parseEther('1.00'),
    CURVE_IBBTC_LP_USD: parseEther('65,924.45'),
    CURVE_AAVE_LP_USD: parseEther('1.1962'),
    CURVE_COMPOUND_LP_USD: parseEther('1.191'),
    CURVE_USDT_LP_USD: parseEther('3.078'),
    CURVE_BUSD_LP_USD: parseEther('0.0219'),
    CURVE_PAX_LP_USD: parseEther('0.0754'),
    CURVE_Y_LP_USD: parseEther('0.012'),
    CURVE_DOLA_3CRV_LP_USD: parseEther('1.02'),
    CURVE_DOLA_FRAXBP_LP_USD: parseEther('1.01'),
    CURVE_GUSD_LP_USD: parseEther('1.04'),
    CURVE_REN_LP_USD: parseEther('66,485.08'),
    CURVE_FRAX_USDC_LP_USD: parseEther('1.00'),
    CURVE_DOLA_FRAX_PYUSD_LP_USD: parseEther('1.00'),
    UNIV2_ETH_DAI_LP_USD: parseEther('199'),
    UNIV2_WBTC_USDC_LP_USD: parseEther('91,317,074,393,093'),
    UNIV2_ETH_WBTC_LP_USD: parseEther('3,285,487,421'),
    vaUSDC_USD: parseEther('1.18'),
    vaDAI_USD: parseEther('1.12'),
    vaFRAX_USD: parseEther('1.22'),
    vaETH_USD: parseEther('2,629'),
    vastETH_USD: parseEther('2,858'),
    varETH_USD: parseEther('2,935'),
    vaWBTC_USD: parseEther('67,030'),
    vaLINK_USD: parseEther('11.39'),
    vacbETH_USD: parseEther('2,850'),
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
