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
  TRICRV_ADDRESS,
  CURVE_SUSD_LP,
  CURVE_IBBTC_SBTC_LP,
  WIBBTC_ADDRESS,
  CURVE_MIM_3CRV_LP,
  MUSD_ADDRESS,
  CURVE_MUSD_LP,
  ALUSD_ADDRESS,
  CURVE_FRAX_3CRV_LP,
  RENBTC_ADDRESS,
  SBTC_ADDRESS,
  CURVE_D3_LP,
  CURVE_SBTC_LP,
  CURVE_AAVE_LP,
  ADAI_ADDRESS,
  AUSDC_ADDRESS,
  AUSDT_ADDRESS,
  CURVE_GUSD_LP,
} = Address.mainnet

const main = async () => {
  const provider = new ethers.providers.JsonRpcProvider(process.env.MAINNET_NODE_URL)
  const wallet = ethers.Wallet.fromMnemonic(process.env.MNEMONIC!).connect(provider)

  const masterOracle = MasterOracle__factory.connect(MASTER_ORACLE_ADDRESS, wallet)
  const curveLpTokenOracle = CurveLpTokenOracle__factory.connect(CURVE_LP_ORACLE_ADDRESS, wallet)
  const curveLpFactoryTokenOracle = CurveFactoryLpTokenOracle__factory.connect(CURVE_FACTORY_LP_ORACLE_ADDRESS, wallet)

  // 3Pool
  // await curveLpTokenOracle.registerPool(TRICRV_ADDRESS)
  // await masterOracle.updateTokenOracle(TRICRV_ADDRESS, CURVE_LP_ORACLE_ADDRESS)

  // MIM+3Crv
  // await curveLpTokenOracle.registerPool(CURVE_MIM_3CRV_LP)
  // await masterOracle.updateTokenOracle(CURVE_MIM_3CRV_LP, CURVE_LP_ORACLE_ADDRESS)

  // FRAX+3Crv
  // await curveLpTokenOracle.registerPool(CURVE_FRAX_3CRV_LP)
  // await masterOracle.updateTokenOracle(CURVE_FRAX_3CRV_LP, CURVE_LP_ORACLE_ADDRESS)

  // SUSD
  // await curveLpTokenOracle.registerPool(CURVE_SUSD_LP)
  // await masterOracle.updateTokenOracle(CURVE_SUSD_LP, CURVE_LP_ORACLE_ADDRESS)

  // MUSD
  // await curveLpTokenOracle.registerPool(CURVE_MUSD_LP)
  // await masterOracle.updateTokenOracle(CURVE_MUSD_LP, CURVE_LP_ORACLE_ADDRESS)
  // await masterOracle.updateTokenOracle(MUSD_ADDRESS, MSTABLE_TOKEN_ORACLE_ADDRESS)

  // ibbBTC
  // await curveLpFactoryTokenOracle.registerPool(CURVE_IBBTC_SBTC_LP)
  // await masterOracle.updateTokenOracle(CURVE_IBBTC_SBTC_LP, CURVE_FACTORY_LP_ORACLE_ADDRESS)
  // await masterOracle.updateTokenOracle(WIBBTC_ADDRESS, IBBTC_TOKEN_ORACLE_ADDRESS)

  // SBTC
  // await curveLpTokenOracle.registerPool(CURVE_SBTC_LP)
  // await masterOracle.updateTokenOracle(CURVE_SBTC_LP, CURVE_LP_ORACLE_ADDRESS)
  // await masterOracle.updateTokenOracle(RENBTC_ADDRESS, BTC_PEGGED_ORACLE_ADDRESS)
  // await masterOracle.updateTokenOracle(SBTC_ADDRESS, BTC_PEGGED_ORACLE_ADDRESS)

  // D3
  // await curveLpFactoryTokenOracle.registerPool(CURVE_D3_LP)
  // await masterOracle.updateTokenOracle(CURVE_D3_LP, curveLpFactoryTokenOracle.address)
  // await masterOracle.updateTokenOracle(ALUSD_ADDRESS, ALUSD_ORACLE_ADDRESS)

  // Aave (aDAI+aUSDC+aUSDT)
  // await curveLpTokenOracle.registerPool(CURVE_AAVE_LP)
  // await masterOracle.updateTokenOracle(CURVE_AAVE_LP, curveLpTokenOracle.address)
  // await masterOracle.updateTokenOracle(ADAI_ADDRESS, ATOKEN_ORACLE_ADDRESS)
  // await masterOracle.updateTokenOracle(AUSDC_ADDRESS, ATOKEN_ORACLE_ADDRESS)
  // await masterOracle.updateTokenOracle(AUSDT_ADDRESS, ATOKEN_ORACLE_ADDRESS)

  // GUSD
  // await curveLpTokenOracle.registerPool(CURVE_GUSD_LP)
  // await masterOracle.updateTokenOracle(CURVE_GUSD_LP, curveLpTokenOracle.address)
}

main().catch(console.log)
