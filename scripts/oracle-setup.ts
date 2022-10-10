/* eslint-disable camelcase */
import {Address} from '../helpers'
import {address as MASTER_ORACLE_ADDRESS} from '../deployments/mainnet/MasterOracle.json'
import {address as CURVE_LP_ORACLE_ADDRESS} from '../deployments/mainnet/CurveLpTokenOracle.json'
import {address as CURVE_FACTORY_LP_ORACLE_ADDRESS} from '../deployments/mainnet/CurveFactoryLpTokenOracle.json'
import {address as MSTABLE_TOKEN_ORACLE_ADDRESS} from '../deployments/mainnet/MStableTokenOracle.json'
import {address as IBBTC_TOKEN_ORACLE_ADDRESS} from '../deployments/mainnet/IbBtcTokenOracle.json'
import {address as BTC_PEGGED_ORACLE_ADDRESS} from '../deployments/mainnet/BTCPeggedTokenOracle.json'
import {address as ALUSD_ORACLE_ADDRESS} from '../deployments/mainnet/AlusdTokenMainnetOracle.json'
import {address as ATOKEN_ORACLE_ADDRESS} from '../deployments/mainnet/ATokenOracle.json'
import {ethers} from 'hardhat'
import {
  CurveFactoryLpTokenOracle__factory,
  CurveLpTokenOracle__factory,
  MasterOracle__factory,
} from '../typechain-types'
import dotenv from 'dotenv'

dotenv.config()

const {
  WIBBTC,
  MUSD,
  ALUSD,
  RENBTC,
  SBTC,
  Curve: {TRIPOOL_LP, SUSD_LP, IBBTC_SBTC_LP, MIM_3CRV_LP, MUSD_LP, FRAX_3CRV_LP, D3_LP, SBTC_LP, AAVE_LP, GUSD_LP},
  Aave: {ADAI, AUSDC, AUSDT},
} = Address.mainnet

const main = async () => {
  const provider = new ethers.providers.JsonRpcProvider(process.env.MAINNET_NODE_URL)
  const wallet = ethers.Wallet.fromMnemonic(process.env.MNEMONIC!).connect(provider)

  const masterOracle = MasterOracle__factory.connect(MASTER_ORACLE_ADDRESS, wallet)
  const curveLpTokenOracle = CurveLpTokenOracle__factory.connect(CURVE_LP_ORACLE_ADDRESS, wallet)
  const curveLpFactoryTokenOracle = CurveFactoryLpTokenOracle__factory.connect(CURVE_FACTORY_LP_ORACLE_ADDRESS, wallet)

  // 3Pool
  // await curveLpTokenOracle.registerLp(CURVE_3CRV_LP)
  // await masterOracle.updateTokenOracle(CURVE_3CRV_LP, CURVE_LP_ORACLE_ADDRESS)

  // MIM+3Crv
  // await curveLpTokenOracle.registerLp(CURVE_MIM_3CRV_LP)
  // await masterOracle.updateTokenOracle(CURVE_MIM_3CRV_LP, CURVE_LP_ORACLE_ADDRESS)

  // FRAX+3Crv
  // await curveLpTokenOracle.registerLp(CURVE_FRAX_3CRV_LP)
  // await masterOracle.updateTokenOracle(CURVE_FRAX_3CRV_LP, CURVE_LP_ORACLE_ADDRESS)

  // SUSD
  // await curveLpTokenOracle.registerLp(CURVE_SUSD_LP)
  // await masterOracle.updateTokenOracle(CURVE_SUSD_LP, CURVE_LP_ORACLE_ADDRESS)

  // MUSD
  // await curveLpTokenOracle.registerLp(CURVE_MUSD_LP)
  // await masterOracle.updateTokenOracle(CURVE_MUSD_LP, CURVE_LP_ORACLE_ADDRESS)
  // await masterOracle.updateTokenOracle(MUSD_ADDRESS, MSTABLE_TOKEN_ORACLE_ADDRESS)

  // ibbBTC
  // await curveLpFactoryTokenOracle.registerLp(CURVE_IBBTC_SBTC_LP)
  // await masterOracle.updateTokenOracle(CURVE_IBBTC_SBTC_LP, CURVE_FACTORY_LP_ORACLE_ADDRESS)
  // await masterOracle.updateTokenOracle(WIBBTC_ADDRESS, IBBTC_TOKEN_ORACLE_ADDRESS)

  // SBTC
  // await curveLpTokenOracle.registerLp(CURVE_SBTC_LP)
  // await masterOracle.updateTokenOracle(CURVE_SBTC_LP, CURVE_LP_ORACLE_ADDRESS)
  // await masterOracle.updateTokenOracle(RENBTC_ADDRESS, BTC_PEGGED_ORACLE_ADDRESS)
  // await masterOracle.updateTokenOracle(SBTC_ADDRESS, BTC_PEGGED_ORACLE_ADDRESS)

  // D3
  // await curveLpFactoryTokenOracle.registerLp(CURVE_D3_LP)
  // await masterOracle.updateTokenOracle(CURVE_D3_LP, curveLpFactoryTokenOracle.address)
  // await masterOracle.updateTokenOracle(ALUSD_ADDRESS, ALUSD_ORACLE_ADDRESS)

  // Aave (aDAI+aUSDC+aUSDT)
  // await curveLpTokenOracle.registerLp(CURVE_AAVE_LP)
  // await masterOracle.updateTokenOracle(CURVE_AAVE_LP, curveLpTokenOracle.address)
  // await masterOracle.updateTokenOracle(ADAI_ADDRESS, ATOKEN_ORACLE_ADDRESS)
  // await masterOracle.updateTokenOracle(AUSDC_ADDRESS, ATOKEN_ORACLE_ADDRESS)
  // await masterOracle.updateTokenOracle(AUSDT_ADDRESS, ATOKEN_ORACLE_ADDRESS)

  // GUSD
  // await curveLpTokenOracle.registerLp(CURVE_GUSD_LP)
  // await masterOracle.updateTokenOracle(CURVE_GUSD_LP, curveLpTokenOracle.address)
}

main().catch(console.log)
