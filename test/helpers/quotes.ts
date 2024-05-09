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
    BTC_USD: parseEther('37,003'),
    ETH_USD: parseEther('2,010'),
    DOGE_USD: parseEther('0.077'),
    BTC_ETH: parseEther('18'),
    USD_ETH: parseEther('0.0004'),
    USD_BTC: parseEther('0.00002'),
    VSP_USD: parseEther('0.4233'),
    CETH_USD: parseEther('40'),
    CDAI_USD: parseEther('0.022'),
    CURVE_TRIPOOL_LP_USD: parseEther('1.022'),
    CURVE_SBTC_LP_USD: parseEther('37,751'),
    CURVE_MIM_3CRV_LP_USD: parseEther('1.007'),
    CURVE_D3POOL_LP_USD: parseEther('0.9679'),
    CURVE_FRAX_3CRV_LP_USD: parseEther('1.00'),
    CURVE_IBBTC_LP_USD: parseEther('37,566.79'),
    CURVE_AAVE_LP_USD: parseEther('1.1352'),
    CURVE_COMPOUND_LP_USD: parseEther('1.136'),
    CURVE_USDT_LP_USD: parseEther('2.979'),
    CURVE_BUSD_LP_USD: parseEther('0.0219'),
    CURVE_PAX_LP_USD: parseEther('0.0754'),
    CURVE_Y_LP_USD: parseEther('0.012'),
    CURVE_DOLA_3CRV_LP_USD: parseEther('1.01'),
    CURVE_DOLA_FRAXBP_LP_USD: parseEther('1.00'),
    CURVE_GUSD_LP_USD: parseEther('1.04'),
    CURVE_REN_LP_USD: parseEther('37,915.42'),
    CURVE_FRAX_USDC_LP_USD: parseEther('1.00'),
    UNIV2_ETH_DAI_LP_USD: parseEther('165'),
    UNIV2_WBTC_USDC_LP_USD: parseEther('65,004,135,304,769'),
    UNIV2_ETH_WBTC_LP_USD: parseEther('2,160,680,207'),
    vaUSDC_USD: parseEther('1.09'),
    vaDAI_USD: parseEther('1.09'),
    vaFRAX_USD: parseEther('1.10'),
    vaETH_USD: parseEther('2,067'),
    vastETH_USD: parseEther('2,146'),
    varETH_USD: parseEther('2,203'),
    vaWBTC_USD: parseEther('38,135'),
    vaLINK_USD: parseEther('14.66'),
    vacbETH_USD: parseEther('2,131'),
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
