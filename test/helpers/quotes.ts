/* eslint-disable camelcase */
import {parseEther} from '.'

/**
 * This file centralizes all prices to make it easier to update them when changing fork blocks
 * Unlike other use cases, it's important to fix block when forking to having precise prices assertions
 */
const Quote = {
  arbitrum: {
    // Since the Arbitrum Nitro launch, `hardhat` isn't supporting forking from it anymore
    // See: https://github.com/NomicFoundation/hardhat/issues/2995
  },
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
  mainnet: {
    BTC_USD: parseEther('19,234'),
    ETH_USD: parseEther('1,420'),
    DOGE_USD: parseEther('0.007'),
    BTC_ETH: parseEther('14'),
    USD_ETH: parseEther('0.0007'),
    USD_BTC: parseEther('0.00005'),
    VSP_USD: parseEther('0.3217'),
    CETH_USD: parseEther('28'),
    CDAI_USD: parseEther('0.022'),
    CURVE_TRIPOOL_LP_USD: parseEther('1.022'),
    CURVE_SBTC_LP_USD: parseEther('19,596'),
    CURVE_MIM_3CRV_LP_USD: parseEther('1.007'),
    CURVE_SUSD_LP_USD: parseEther('1.057'),
    CURVE_D3POOL_LP_USD: parseEther('0.993'),
    CURVE_FRAX_3CRV_LP_USD: parseEther('1.00'),
    CURVE_IBBTC_LP_USD: parseEther('19,507.48'),
    CURVE_MUSD_LP_USD: parseEther('1.020'),
    CURVE_AAVE_LP_USD: parseEther('1.1021'),
    CURVE_COMPOUND_LP_USD: parseEther('1.103'),
    CURVE_USDT_LP_USD: parseEther('2.926'),
    CURVE_BUSD_LP_USD: parseEther('1.133'),
    CURVE_PAX_LP_USD: parseEther('1.04'),
    CURVE_Y_LP_USD: parseEther('1.138'),
    CURVE_DOLA_3CRV_LP_USD: parseEther('1.00'),
    CURVE_DOLA_FRAXBP_LP_USD: parseEther('1.00'),
    CURVE_GUSD_LP_USD: parseEther('1.03'),
    CURVE_REN_LP_USD: parseEther('19,712.92'),
    CURVE_FRAX_USDC_LP_USD: parseEther('1.00'),
    UNIV2_ETH_DAI_LP_USD: parseEther('134'),
    UNIV2_WBTC_USDC_LP_USD: parseEther('45,425,325,418,365'),
    UNIV2_ETH_WBTC_LP_USD: parseEther('1,294,950,658'),
    vaUSDC_USD: parseEther('1.03'),
    vaDAI_USD: parseEther('1.07'),
    vaFRAX_USD: parseEther('1.03'),
    vaETH_USD: parseEther('1,461'),
    vastETH_USD: parseEther('1,441'),
    vaWBTC_USD: parseEther('19,540.27'),
    vaLINK_USD: parseEther('6.52'),
  },
  polygon: {
    MATIC_USD: parseEther('0.84'),
    BTC_USD: parseEther('20,060'),
    ETH_USD: parseEther('1,359'),
  },
  bsc: {
    BTC_USD: parseEther('20,058'),
    ETH_USD: parseEther('1,359'),
    BNB_USD: parseEther('266'),
    BNB_USD_2: parseEther('253'),
    BUSD_USD: parseEther('1'),
    ELLIPSIS_VAL_3EPS: parseEther('1.003'),
  },
  mumbai: {MATIC_USD: parseEther('0.84'), ETH_USD: parseEther('1,359')},
  optimism: {
    ETH_USD: parseEther('1,543'),
  }
}
export default Quote
