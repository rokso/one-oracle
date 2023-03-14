import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {Addresses} from '../../helpers/address'
import {setupTokenOracles} from '../../helpers/deployment'

const {mainnet: Address} = Addresses

const setupOracles = 'setupOracles'

const chainlinkAggregators = [
  // MakerDAO uses BTC/USD Chainlink feed for renBTC
  // See: https://forum.makerdao.com/t/renbtc-mip6-collateral-application/2971
  {token: Address.RENBTC, aggregator: Address.Chainlink.CHAINLINK_BTC_USD_AGGREGATOR},
  // Synthetix uses BTC/USD Chainlink feed for sBTC
  {token: Address.SBTC, aggregator: Address.Chainlink.CHAINLINK_BTC_USD_AGGREGATOR},
  {token: Address.Synth.msETH, aggregator: Address.Chainlink.CHAINLINK_ETH_USD_AGGREGATOR},
  {token: Address.Synth.msBTC, aggregator: Address.Chainlink.CHAINLINK_BTC_USD_AGGREGATOR},
  {token: Address.Synth.msDOGE, aggregator: Address.Chainlink.CHAINLINK_DOGE_USD_AGGREGATOR},
]

const curveLpTokens = [
  {token: Address.Curve.TRIPOOL_LP, isLending: false},
  {token: Address.Curve.MIM_3CRV_LP, isLending: false},
  {token: Address.Curve.FRAX_3CRV_LP, isLending: false},
  {token: Address.Curve.SUSD_LP, isLending: false},
  {token: Address.Curve.MUSD_LP, isLending: false},
  {token: Address.Curve.SBTC_LP, isLending: false},
  {token: Address.Curve.AAVE_LP, isLending: false},
  {token: Address.Curve.COMPOUND_LP, isLending: true},
  {token: Address.Curve.USDT_LP, isLending: true},
  {token: Address.Curve.BUSD_LP, isLending: true},
  {token: Address.Curve.PAX_LP, isLending: true},
  {token: Address.Curve.Y_LP, isLending: true},
  {token: Address.Curve.GUSD_LP, isLending: false},
  {token: Address.Curve.REN_LP, isLending: false},
  {token: Address.Curve.FRAX_USDC_LP, isLending: false},
]

const curveFactoryLps = [
  Address.Curve.IBBTC_SBTC_LP,
  Address.Curve.D3_LP,
  Address.Curve.DOLA_3CRV_LP,
  Address.Curve.DOLA_FRAXBP_LP,
]

const customOracles = [
  {token: Address.MUSD, oracle: 'MStableTokenOracle'},
  {token: Address.WIBBTC, oracle: 'IbBtcTokenOracle'},
  {token: Address.ALUSD, oracle: 'AlusdTokenMainnetOracle'},
  {token: Address.Compound.CDAI, oracle: 'CTokenOracle'},
  {token: Address.Compound.CUSDC, oracle: 'CTokenOracle'},
  {token: Address.Compound.CETH, oracle: 'CTokenOracle'},
  {token: Address.Aave.ADAI, oracle: 'ATokenOracle'},
  {token: Address.Aave.AUSDC, oracle: 'ATokenOracle'},
  {token: Address.Aave.AUSDT, oracle: 'ATokenOracle'},
  {token: Address.Vesper.vaUSDC, oracle: 'VPoolTokenOracle'},
  {token: Address.Vesper.vaDAI, oracle: 'VPoolTokenOracle'},
  {token: Address.Vesper.vaFRAX, oracle: 'VPoolTokenOracle'},
  {token: Address.Vesper.vaETH, oracle: 'VPoolTokenOracle'},
  {token: Address.Vesper.vastETH, oracle: 'VPoolTokenOracle'},
  {token: Address.Vesper.vaWBTC, oracle: 'VPoolTokenOracle'},
  {token: Address.Vesper.vaLINK, oracle: 'VPoolTokenOracle'},
  {token: Address.Vesper.varETH, oracle: 'VPoolTokenOracle'},
  // Curve busd pool (yDAI+yUSDC+yUSDT+yBUSD)
  {token: Address.Yearn.yDAIv3, oracle: 'YEarnTokenOracle'},
  {token: Address.Yearn.yUSDCv3, oracle: 'YEarnTokenOracle'},
  {token: Address.Yearn.yUSDTv3, oracle: 'YEarnTokenOracle'},
  {token: Address.Yearn.yBUSD, oracle: 'YEarnTokenOracle'},
  // Curve pax pool (ycDAI+ycUSDC+ycUSDT+USDP)
  {token: Address.Yearn.ycDAI, oracle: 'YEarnTokenOracle'},
  {token: Address.Yearn.ycUSDC, oracle: 'YEarnTokenOracle'},
  {token: Address.Yearn.ycUSDT, oracle: 'YEarnTokenOracle'},
  // Curve y pool (yDAI+yUSDC+yYSDT+yTUSD)
  {token: Address.Yearn.yDAI, oracle: 'YEarnTokenOracle'},
  {token: Address.Yearn.yUSDC, oracle: 'YEarnTokenOracle'},
  {token: Address.Yearn.yUSDT, oracle: 'YEarnTokenOracle'},
  {token: Address.Yearn.yTUSD, oracle: 'YEarnTokenOracle'},
  {token: Address.Synth.msUSD, oracle: 'USDPeggedTokenOracle'},
  {token: Address.DOLA, oracle: 'USDPeggedTokenOracle'},
  // Frax sFraxETH
  {token: Address.Frax.sFrxETH, oracle: 'SFraxEthTokenOracle'},
]

const customStalePeriods = [
  {token: Address.USDT, stalePeriod: 60 * 60 * 24},
  {token: Address.USDC, stalePeriod: 60 * 60 * 24},
  {token: Address.sUSD, stalePeriod: 60 * 60 * 24},
  {token: Address.FRAX, stalePeriod: 60 * 60 * 24},
  {token: Address.Synth.msDOGE, stalePeriod: 60 * 60 * 24},
]

const chainlinkEthOnly = [
  {token: Address.stETH, ethFeed: Address.Chainlink.CHAINLINK_STETH_ETH_AGGREGATOR},
  {token: Address.rETH, ethFeed: Address.Chainlink.CHAINLINK_RETH_ETH_AGGREGATOR},
]

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  await setupTokenOracles(hre, {
    customOracles,
    chainlinkAggregators,
    curveLpTokens,
    curveFactoryLps,
    customStalePeriods,
    chainlinkEthOnly,
  })
}

func.tags = [setupOracles]
export default func
