/* eslint-disable complexity */
/* eslint-disable camelcase */
import {HardhatRuntimeEnvironment} from 'hardhat/types'

const ChainlinkPriceProvider = 'ChainlinkPriceProvider'
const MasterOracle = 'MasterOracle'
const CurveLpTokenOracle = 'CurveLpTokenOracle'
const CurveFactoryLpTokenOracle = 'CurveFactoryLpTokenOracle'
const EllipsisLpTokenOracle = 'EllipsisLpTokenOracle'
const ChainlinkOracle = 'ChainlinkOracle'

const setupTokenOracles = async (
  hre: HardhatRuntimeEnvironment,
  {
    customOracles,
    chainlinkAggregators,
    curveLpTokens,
    curveFactoryLps = [],
    customStalePeriods = [],
  }: {
    customOracles?: {token: string; oracle: string}[]
    chainlinkAggregators?: {token: string; aggregator: string}[]
    curveLpTokens?: {token: string; isLending: boolean}[]
    curveFactoryLps?: string[]
    customStalePeriods?: {token: string; stalePeriod: number}[]
  }
) => {
  const {getNamedAccounts, deployments} = hre
  const {read, get, getOrNull, execute} = deployments
  const {deployer: from} = await getNamedAccounts()

  // Custom Oracles
  if (customOracles) {
    for (const {token, oracle} of customOracles) {
      const {address: oracleAddress} = await get(oracle)
      const current = await read(MasterOracle, 'oracles', token)
      if (current !== oracleAddress) {
        await execute(MasterOracle, {from, log: true}, 'updateTokenOracle', token, oracleAddress)
      }
    }
  }

  // Chainlink
  if (chainlinkAggregators) {
    for (const {token, aggregator} of chainlinkAggregators) {
      const current = await read(ChainlinkPriceProvider, 'aggregators', token)
      if (current !== aggregator) {
        await execute(ChainlinkPriceProvider, {from, log: true}, 'updateAggregator', token, aggregator)
      }
    }
  }

  // Curve LPs
  if (curveLpTokens) {
    let CurveLikeLpTokenOracle = CurveLpTokenOracle
    let curveLpTokenOracle = await getOrNull(CurveLikeLpTokenOracle)
    if (!curveLpTokenOracle) {
      CurveLikeLpTokenOracle = EllipsisLpTokenOracle
      curveLpTokenOracle = await get(CurveLikeLpTokenOracle)
    }
    const {address: curveLpOracleAddress} = curveLpTokenOracle
    for (const {token, isLending} of curveLpTokens) {
      const current = await read(MasterOracle, 'oracles', token)
      if (current !== curveLpOracleAddress) {
        await execute(MasterOracle, {from, log: true}, 'updateTokenOracle', token, curveLpOracleAddress)
        if (isLending) {
          await execute(CurveLikeLpTokenOracle, {from, log: true}, 'registerLendingLp', token)
        } else {
          await execute(CurveLikeLpTokenOracle, {from, log: true}, 'registerLp', token)
        }
      }
    }
  }

  // Curve Factory LPs
  const curveFactoryLpTokenOracle = await getOrNull(CurveFactoryLpTokenOracle)
  if (curveFactoryLpTokenOracle) {
    const {address: curveFactoryLpOracleAddress} = curveFactoryLpTokenOracle
    for (const token of curveFactoryLps) {
      const current = await read(MasterOracle, 'oracles', token)
      if (current !== curveFactoryLpOracleAddress) {
        await execute(MasterOracle, {from, log: true}, 'updateTokenOracle', token, curveFactoryLpOracleAddress)

        const alreadyRegistered = await read(CurveFactoryLpTokenOracle, 'isLpRegistered', token)
        if (!alreadyRegistered) {
          await execute(CurveFactoryLpTokenOracle, {from, log: true}, 'registerLp', token)
        }
      }
    }
  }

  // Custom Stale periods
  if (customStalePeriods) {
    const {address: chainlinkOracleAddress} = await get(ChainlinkOracle)
    const defaultOracleAddress = await read(MasterOracle, 'defaultOracle')
    if (defaultOracleAddress != chainlinkOracleAddress) {
      throw Error('ChainlinkOracle is not the default oracle')
    }

    for (const {token, stalePeriod} of customStalePeriods) {
      const current = await read(ChainlinkOracle, 'stalePeriodOf', token)
      if (current !== stalePeriod) {
        await execute(ChainlinkOracle, {from, log: true}, 'updateCustomStalePeriod', token, stalePeriod)
      }
    }
  }
}

export {setupTokenOracles}
