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
    BTC_USD: parseEther('20,058'),
    ETH_USD: parseEther('1,359'),
    BTC_ETH: parseEther('14'),
    USD_ETH: parseEther('0.0007'),
    USD_BTC: parseEther('0.00004'),
    VSP_USD: parseEther('0.4359'),
    CETH_USD: parseEther('27'),
    CDAI_USD: parseEther('0.022'),
    CURVE_TRIPOOL_LP_USD: parseEther('1.022'),
    CURVE_SBTC_LP_USD: parseEther('20,316'),
    CURVE_MIM_3CRV_LP_USD: parseEther('1.004'),
    CURVE_SUSD_LP_USD: parseEther('1.057'),
    CURVE_D3POOL_LP_USD: parseEther('0.993'),
    CURVE_FRAX_3CRV_LP_USD: parseEther('1.00'),
    CURVE_IBBTC_LP_USD: parseEther('20,196.42'),
    CURVE_MUSD_LP_USD: parseEther('1.019'),
    CURVE_AAVE_LP_USD: parseEther('1.096'),
    CURVE_COMPOUND_LP_USD: parseEther('1.103'),
    CURVE_USDT_LP_USD: parseEther('2.926'),
    CURVE_BUSD_LP_USD: parseEther('1.133'),
    CURVE_PAX_LP_USD: parseEther('1.04'),
    CURVE_Y_LP_USD: parseEther('1.138'),
    CURVE_DOLA_3CRV_LP_USD: parseEther('1.00'),
    CURVE_DOLA_FRAXBP_LP_USD: parseEther('1.00'),
    CURVE_GUSD_LP_USD: parseEther('1.02'),
    CURVE_REN_LP_USD: parseEther('20,465.96'),
    CURVE_FRAX_USDC_LP_USD: parseEther('1.00'),
    UNIV2_ETH_DAI_LP_USD: parseEther('129'),
    UNIV2_WBTC_USDC_LP_USD: parseEther('37,068,436,574,606'),
    UNIV2_ETH_WBTC_LP_USD: parseEther('1,281,940,794'),
    vaUSDC_USD: parseEther('1.03'),
    vaDAI_USD: parseEther('1.07'),
    vaFRAX_USD: parseEther('1.03'),
    vaETH_USD: parseEther('1,388'),
    vastETH_USD: parseEther('1,360'),
    vaWBTC_USD: parseEther('20,328.67'),
    vaLINK_USD: parseEther('7.87'),    
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
}
export default Quote
