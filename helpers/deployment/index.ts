import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {saveForMultiSigBatchExecution, executeUsingMultiSig} from './multisig-helpers'
import {setupTokenOracles} from './setup-oracles'
import {Address} from '../address'

export const saveGovernorExecutionForMultiSigBatch = async (
  hre: HardhatRuntimeEnvironment,
  contract: string,
  methodName: string,
  ...args: any[]
) => {
  const {deployments, getNamedAccounts} = hre
  const {execute, catchUnknownSigner} = deployments
  const {deployer} = await getNamedAccounts()

  const log = hre.network.name == 'hardhat' ? false : true

  const governor = Address.GOVERNOR || deployer
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
  const {deployments, getNamedAccounts} = hre
  const {execute, catchUnknownSigner} = deployments
  const {deployer} = await getNamedAccounts()

  const log = hre.network.name == 'hardhat' ? false : true

  const governor = Address.GOVERNOR || deployer
  const multiSigTx = await catchUnknownSigner(execute(contract, {from: governor, log}, methodName, ...args), {
    log,
  })

  if (multiSigTx) {
    await executeUsingMultiSig(hre, multiSigTx)
  }
}

export {setupTokenOracles}
