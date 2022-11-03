/* eslint-disable complexity */
/* eslint-disable camelcase */
import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {expect} from 'chai'
import Address from './address'
import {ethers, network} from 'hardhat'
import {AddressProvider__factory} from '../typechain-types'

const AddressProvider = 'AddressProvider'
const ChainlinkPriceProvider = 'ChainlinkPriceProvider'
const MasterOracle = 'MasterOracle'
const CurveLpTokenOracle = 'CurveLpTokenOracle'
const CurveFactoryLpTokenOracle = 'CurveFactoryLpTokenOracle'
const EllipsisLpTokenOracle = 'EllipsisLpTokenOracle'
const ChainlinkOracle = 'ChainlinkOracle'

const deployAddressProvider = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deterministic} = deployments
  const {deployer} = await getNamedAccounts()

  if (deployer !== Address.DEPLOYER) {
    console.log(`The AddressProvider must be deployed by '${Address.DEPLOYER}'`)
    console.log('Skipping AddressProvider deployment...')
  }

  // Tests don't read from `deployments` config files, because of that deployment with deterministic address
  // will fail in fork chains when the contract already exist:
  // Error: already deployed on same deterministic address: 0xfbA0816A81bcAbBf3829bED28618177a2bf0e82A
  const alreadyDeployed = (await ethers.provider.getCode(Address.ADDRESS_PROVIDER)) !== '0x'
  if (network.name === 'hardhat' && alreadyDeployed) {
    const {abi} = AddressProvider__factory
    await deployments.save(AddressProvider, {abi, address: Address.ADDRESS_PROVIDER})
    return
  }

  // Both 'OpenZeppelinTransparentProxy' and 'AddressProvider' codes must always be the same when deploying
  // in order to result in the same address across all chains.
  // For instance, if we have a new version of the `AddressProvider`, we must deploy the 1st version then upgrade it.
  //
  // If it became a recurrent issue, we can improve this script by using any contract that exists in many chains
  // as the implementation during deployment and them upgrade it to the latest version of `AddressProvider`,
  // an example of contract that we may use is the create2 factory ('0x914d7Fec6aaC8cd542e72Bca78B30650d45643d7')
  const {deploy} = await deterministic(AddressProvider, {
    contract: AddressProvider,
    from: deployer,
    log: true,
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        init: {
          methodName: 'initialize',
          args: [deployer],
        },
      },
    },
  })

  const {address} = await deploy()
  expect(address).eq(Address.ADDRESS_PROVIDER)
}
deployAddressProvider.tags = [AddressProvider]

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

export {deployAddressProvider, setupTokenOracles}
