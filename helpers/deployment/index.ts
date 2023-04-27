/* eslint-disable @typescript-eslint/no-explicit-any */
import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {saveForMultiSigBatchExecution, executeUsingMultiSig} from './multisig-helpers'
import {setupTokenOracles} from './setup-oracles'

export const saveGovernorExecutionForMultiSigBatch = async (
  hre: HardhatRuntimeEnvironment,
  contract: string,
  methodName: string,
  ...args: any[]
) => {
  const {deployments} = hre
  const {execute, catchUnknownSigner, read} = deployments

  const log = hre.network.name == 'hardhat' ? false : true

  const governor = await read(contract, 'governor')
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

  const governor = await read(contract, 'governor')
  const multiSigTx = await catchUnknownSigner(execute(contract, {from: governor, log}, methodName, ...args), {
    log,
  })

  if (multiSigTx) {
    await executeUsingMultiSig(hre, multiSigTx)
  }
}

export {setupTokenOracles}
