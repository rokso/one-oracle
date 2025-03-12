import fs from 'fs'
import {exit} from 'process'
import {MetaTransactionData} from '@safe-global/safe-core-sdk-types'
import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {impersonateAccount} from '../../test/helpers'
import {GnosisSafeInitializer} from './gnosis-safe'
import {Address} from '../../helpers/address'
import chalk from 'chalk'

const MULTI_SIG_TXS_FILE = 'multisig.batch.tmp.json'

// Type returned by `hardhat-deploy`'s `catchUnknownSigner` function
type MultiSigTx = {
  from: string
  to?: string | undefined
  value?: string | undefined
  data?: string | undefined
}

const log = (hre: HardhatRuntimeEnvironment, message: string) => {
  if (hre.network.name != 'hardhat') {
    // eslint-disable-next-line no-console
    console.log(chalk.blue(message))
  }
}

const proposeMultiSigTransaction = async (
  hre: HardhatRuntimeEnvironment,
  transactions: MetaTransactionData[]
): Promise<void> => {
  if (['hardhat', 'localhost'].includes(hre.network.name)) {
    const from = Address.GNOSIS_SAFE === hre.ethers.constants.AddressZero ? Address.GOVERNOR : Address.GNOSIS_SAFE
    const w = await impersonateAccount(from)
    for (const tx of transactions) {
      const {to, data} = tx
      await w.sendTransaction({to, data})
    }

    log(hre, 'Because it is a test deployment, the transaction was executed by impersonated multi-sig.')
    log(hre, 'On the live deployment, the script exits here and asks for manual proposal execution.')

    return
  }

  const {getNamedAccounts} = hre
  const {deployer} = await getNamedAccounts()
  const delegate = await hre.ethers.getSigner(deployer)
  const gnosisSafe = await GnosisSafeInitializer.init(hre, delegate)
  const hash = await gnosisSafe.proposeTransaction(transactions)
  log(hre, `MultiSig tx '${hash}' was proposed.`)
  log(hre, 'Wait for tx to confirm (at least 2 confirmations is recommended).')
  log(hre, 'After confirmation, you must run the deployment again.')
  log(hre, 'That way the `hardhat-deploy` will be able to catch the changes and update `deployments/` files.')
  exit()
}

// Note: Parse `hardhat-deploy` tx to `Safe` tx
const prepareTx = async (
  hre: HardhatRuntimeEnvironment,
  {from, to, data, value}: MultiSigTx
): Promise<MetaTransactionData> => {
  if (!to || !data) {
    throw Error('The `to` and `data` args can not be null')
  }

  const actualDeployment = !['hardhat', 'localhost'].includes(hre.network.name)

  if (actualDeployment && from !== Address.GNOSIS_SAFE) {
    throw Error(`Trying to prepare a multi-sig transaction but sender ('${from}') isn't the safe address.`)
  }

  return {to, data, value: value || '0'}
}

export const executeUsingMultiSig = async (hre: HardhatRuntimeEnvironment, rawTx: MultiSigTx): Promise<void> => {
  const tx = await prepareTx(hre, rawTx)
  await proposeMultiSigTransaction(hre, [tx])
}

export const executeBatchUsingMultisig = async (hre: HardhatRuntimeEnvironment): Promise<void> => {
  if (!fs.existsSync(MULTI_SIG_TXS_FILE)) {
    return
  }

  const file = fs.readFileSync(MULTI_SIG_TXS_FILE)

  const transactions: MetaTransactionData[] = JSON.parse(file.toString())

  log(hre, 'Proposing multi-sig batch transaction...')
  await proposeMultiSigTransaction(hre, transactions)

  fs.unlinkSync(MULTI_SIG_TXS_FILE)
}

export const saveForMultiSigBatchExecution = async (
  hre: HardhatRuntimeEnvironment,
  rawTx: MultiSigTx
): Promise<void> => {
  if (!fs.existsSync(MULTI_SIG_TXS_FILE)) {
    fs.closeSync(fs.openSync(MULTI_SIG_TXS_FILE, 'w'))
  }

  const file = fs.readFileSync(MULTI_SIG_TXS_FILE)

  const tx = await prepareTx(hre, rawTx)

  if (file.length == 0) {
    fs.writeFileSync(MULTI_SIG_TXS_FILE, JSON.stringify([tx]))
  } else {
    const current = JSON.parse(file.toString()) as MetaTransactionData[]

    const alreadyStored = current.find(
      (i: MetaTransactionData) => i.to == tx.to && i.data == tx.data && i.value == tx.value
    )

    if (alreadyStored) {
      log(hre, `This multi-sig transaction is already saved in '${MULTI_SIG_TXS_FILE}'.`)
      return
    }

    const json = [...current, tx]
    fs.writeFileSync(MULTI_SIG_TXS_FILE, JSON.stringify(json))
  }

  log(hre, `Multi-sig transaction saved in '${MULTI_SIG_TXS_FILE}'.`)
}
