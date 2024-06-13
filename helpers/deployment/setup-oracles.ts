/* eslint-disable complexity */
/* eslint-disable camelcase */
import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {saveGovernorExecutionForMultiSigBatch} from '../../helpers/deployment/'
import {BigNumber} from 'ethers'

const ChainlinkPriceProvider = 'ChainlinkPriceProvider'
const MasterOracle = 'MasterOracle'
const CurveLpTokenOracle = 'CurveLpTokenOracle'
const CurveLpTokenOracleV2 = 'CurveLpTokenOracleV2'
const CurveFactoryLpTokenOracle = 'CurveFactoryLpTokenOracle'
const ChainlinkOracle = 'ChainlinkOracle'
const ChainlinkEthOnlyTokenOracle = 'ChainlinkEthOnlyTokenOracle'

export const setupTokenOracles = async (
  hre: HardhatRuntimeEnvironment,
  {
    customOracles,
    chainlinkAggregators,
    curveLpTokens,
    curveLpTokensV2 = [],
    curveFactoryLps = [],
    customStalePeriods = [],
    chainlinkEthOnly = [],
  }: {
    customOracles?: {token: string; oracle: string}[]
    chainlinkAggregators?: {token: string; aggregator: string}[]
    curveLpTokens?: {token: string; isLending: boolean}[]
    curveLpTokensV2?: string[]
    curveFactoryLps?: string[]
    customStalePeriods?: {token: string; stalePeriod: number}[]
    chainlinkEthOnly?: {token: string; ethFeed: string}[]
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
        await saveGovernorExecutionForMultiSigBatch(hre, MasterOracle, 'updateTokenOracle', token, oracleAddress)
      }
    }
  }

  // Chainlink
  if (chainlinkAggregators) {
    for (const {token, aggregator} of chainlinkAggregators) {
      const current = await read(ChainlinkPriceProvider, 'aggregators', token)
      if (current !== aggregator) {
        await saveGovernorExecutionForMultiSigBatch(hre, ChainlinkPriceProvider, 'updateAggregator', token, aggregator)
      }
    }
  }

  // Curve LPs
  if (curveLpTokens) {
    let curveLpTokenOracle = await getOrNull(CurveLpTokenOracle)
    if (curveLpTokenOracle) {
      const {address: curveLpOracleAddress} = curveLpTokenOracle
      for (const {token, isLending} of curveLpTokens) {
        const current = await read(MasterOracle, 'oracles', token)
        if (current !== curveLpOracleAddress) {
          await saveGovernorExecutionForMultiSigBatch(
            hre,
            MasterOracle,
            'updateTokenOracle',
            token,
            curveLpOracleAddress
          )
        }

        // The deployed contract hasn't the `isLpRegistered()` yet (https://github.com/bloqpriv/one-oracle/issues/404)
        // const isLpRegistered = await read(CurveLpTokenOracle, 'isLpRegistered', token)
        let isLpRegistered = false
        try {
          await read(CurveLpTokenOracle, 'underlyingTokens', token, 0)
          isLpRegistered = true
          // eslint-disable-next-line no-empty
        } catch {}

        if (!isLpRegistered) {
          if (isLending) {
            await saveGovernorExecutionForMultiSigBatch(hre, CurveLpTokenOracle, 'registerLendingLp', token)
          } else {
            await saveGovernorExecutionForMultiSigBatch(hre, CurveLpTokenOracle, 'registerLp', token)
          }
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
        await saveGovernorExecutionForMultiSigBatch(
          hre,
          MasterOracle,
          'updateTokenOracle',
          token,
          curveFactoryLpOracleAddress
        )

        const alreadyRegistered = await read(CurveFactoryLpTokenOracle, 'isLpRegistered', token)
        if (!alreadyRegistered) {
          // Note: No governor required for the `CurveFactoryLpTokenOracle` contract
          await execute(CurveFactoryLpTokenOracle, {from, log: true}, 'registerLp', token)
        }
      }
    }
  }

  // Curve LPs V2
  const curveLpTokenOracleV2 = await getOrNull(CurveLpTokenOracleV2)
  if (curveLpTokenOracleV2) {
    const {address: oracleAddress} = curveLpTokenOracleV2
    for (const token of curveLpTokensV2) {
      const current = await read(MasterOracle, 'oracles', token)
      if (current !== oracleAddress) {
        await saveGovernorExecutionForMultiSigBatch(hre, MasterOracle, 'updateTokenOracle', token, oracleAddress)

        const isLpRegistered = await read(CurveLpTokenOracleV2, 'isLpRegistered', token)
        if (!isLpRegistered) {
          await saveGovernorExecutionForMultiSigBatch(hre, CurveLpTokenOracleV2, 'registerLp', token)
        }
      }
    }
  }

  // Custom Stale periods
  if (customStalePeriods.length > 0) {
    const {address: chainlinkOracleAddress} = await get(ChainlinkOracle)
    const defaultOracleAddress = await read(MasterOracle, 'defaultOracle')
    if (defaultOracleAddress != chainlinkOracleAddress) {
      throw Error('ChainlinkOracle is not the default oracle')
    }

    for (const {token, stalePeriod} of customStalePeriods) {
      const current: BigNumber = await read(ChainlinkOracle, 'stalePeriodOf', token)
      if (current.toNumber() !== stalePeriod) {
        await saveGovernorExecutionForMultiSigBatch(hre, ChainlinkOracle, 'updateCustomStalePeriod', token, stalePeriod)
      }
    }
  }

  // Chainlink ETH-Only
  if (chainlinkEthOnly.length > 0) {
    const {address: chainlinkEthOnlyOracleAddress} = await get(ChainlinkEthOnlyTokenOracle)
    for (const {token, ethFeed} of chainlinkEthOnly) {
      const current = await read(MasterOracle, 'oracles', token)
      if (current !== chainlinkEthOnlyOracleAddress) {
        await saveGovernorExecutionForMultiSigBatch(
          hre,
          MasterOracle,
          'updateTokenOracle',
          token,
          chainlinkEthOnlyOracleAddress
        )

        const currentFeed: string = await read(ChainlinkEthOnlyTokenOracle, 'ethFeedOf', token)
        if (currentFeed !== ethFeed) {
          await saveGovernorExecutionForMultiSigBatch(hre, ChainlinkEthOnlyTokenOracle, 'updateEthFeed', token, ethFeed)
        }
      }
    }
  }
}
