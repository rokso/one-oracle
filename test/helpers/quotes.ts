/* eslint-disable camelcase */
import {parseEther} from '.'

/**
 * This file centralizes all prices to make it easier to update them when changing fork blocks
 * Unlike other use cases, it's important to fix block when forking to having precise prices assertions
 */
const Quote = {
  avalanche: {
    BTC_USD: parseEther('20,058'),
    ETH_USD: parseEther('1,359'),
    AVAX_USD: parseEther('17'),
    UNI_USD: parseEther('6.91'),
    CRV_USD: parseEther('0.91'),
    AAVE_USD: parseEther('78'),
    CURVE_REN_LP_USD: parseEther('20,185'),
    CURVE_AAVE_LP_USD: parseEther('1.02'),
  },
  base: {
    ETH_USD: parseEther('3,063'),
  },
  mainnet: {
    BTC_USD: parseEther('67,023'),
    ETH_USD: parseEther('3,492'),
    DOGE_USD: parseEther('0.077'),
    BTC_ETH: parseEther('19'),
    USD_ETH: parseEther('0.00028'),
    USD_BTC: parseEther('0.00002'),
    VSP_USD: parseEther('0.4422'),
    CETH_USD: parseEther('70'),
    CDAI_USD: parseEther('0.023'),
    CURVE_TRIPOOL_LP_USD: parseEther('1.032'),
    CURVE_SBTC_LP_USD: parseEther('68,439'),
    CURVE_MIM_3CRV_LP_USD: parseEther('1.008'),
    CURVE_D3POOL_LP_USD: parseEther('0.9328'),
    CURVE_FRAX_3CRV_LP_USD: parseEther('1.00'),
    CURVE_IBBTC_LP_USD: parseEther('68,111.20'),
    CURVE_AAVE_LP_USD: parseEther('1.1837'),
    CURVE_COMPOUND_LP_USD: parseEther('1.178'),
    CURVE_USDT_LP_USD: parseEther('3.054'),
    CURVE_BUSD_LP_USD: parseEther('0.0219'),
    CURVE_PAX_LP_USD: parseEther('0.0754'),
    CURVE_Y_LP_USD: parseEther('0.012'),
    CURVE_DOLA_3CRV_LP_USD: parseEther('1.02'),
    CURVE_DOLA_FRAXBP_LP_USD: parseEther('1.00'),
    CURVE_GUSD_LP_USD: parseEther('1.04'),
    CURVE_REN_LP_USD: parseEther('68,698.70'),
    CURVE_FRAX_USDC_LP_USD: parseEther('1.00'),
    CURVE_DOLA_FRAX_PYUSD_LP_USD: parseEther('1.00'),
    UNIV2_ETH_DAI_LP_USD: parseEther('226'),
    UNIV2_WBTC_USDC_LP_USD: parseEther('92,099,310,887,088'),
    UNIV2_ETH_WBTC_LP_USD: parseEther('3,879,098,987'),
    vaUSDC_USD: parseEther('1.16'),
    vaDAI_USD: parseEther('1.11'),
    vaFRAX_USD: parseEther('1.20'),
    vaETH_USD: parseEther('3,551'),
    vastETH_USD: parseEther('3,836'),
    varETH_USD: parseEther('3,954'),
    vaWBTC_USD: parseEther('69,833'),
    vaLINK_USD: parseEther('15.58'),
    vacbETH_USD: parseEther('3,840'),
  },
  polygon: {
    MATIC_USD: parseEther('0.84'),
    BTC_USD: parseEther('20,060'),
    ETH_USD: parseEther('1,359'),
  },
  optimism: {
    ETH_USD: parseEther('1,786'),
    USDC_USD: parseEther('1'),
    DAI_USD: parseEther('1'),
    OP_USD: parseEther('1.7'),
    vaUSDC_USD: parseEther('1'),
    vaETH_USD: parseEther('1,796'),
    vastETH_USD: parseEther('2,011'),
    vaOP_USD: parseEther('1.61'),
  },
}
export default Quote
