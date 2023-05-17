/* eslint-disable @typescript-eslint/no-explicit-any */
import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {saveForMultiSigBatchExecution, executeUsingMultiSig} from './multisig-helpers'
import {setupTokenOracles} from './setup-oracles'
import {ethers} from 'hardhat'

export const saveGovernorExecutionForMultiSigBatch = async (
  hre: HardhatRuntimeEnvironment,
  contract: string,
  methodName: string,
  ...args: any[]
) => {
  const {deployments} = hre
  const {execute, catchUnknownSigner, read} = deployments

  const log = hre.network.name == 'hardhat' ? false : true

  const addressProviderAddress = await read(contract, 'addressProvider')
  const addressProvider = new ethers.Contract(
    addressProviderAddress,
    ['function governor() view returns(address)'],
    ethers.provider
  )
  const governor = await addressProvider.governor()
  const multiSigTx = await catchUnknownSigner(execute(contract, {from: governor, log}, methodName, ...args), {
    log,
  })

  if (multiSigTx) {
    await saveForMultiSigBatchExecution(hre, multiSigTx)
  }
}

export const executeFromGovernorMultiSig = async (
  hre: HardhatRuntimeEnvironment,
  contract: string,
  methodName: string,
  ...args: any[]
) => {
  const {deployments} = hre
  const {execute, catchUnknownSigner, read} = deployments

  const log = hre.network.name == 'hardhat' ? false : true

  const addressProviderAddress = await read(contract, 'addressProvider')
  const addressProvider = new ethers.Contract(
    addressProviderAddress,
    ['function governor() view returns(address)'],
    ethers.provider
  )
  const governor = await addressProvider.governor()
  const multiSigTx = await catchUnknownSigner(execute(contract, {from: governor, log}, methodName, ...args), {
    log,
  })

  if (multiSigTx) {
    await executeUsingMultiSig(hre, multiSigTx)
  }
}

export {setupTokenOracles}
