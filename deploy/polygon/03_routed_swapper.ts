import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {ExchangeType} from '../../helpers'
import {Addresses} from '../../helpers/address'
import {saveGovernorExecutionForMultiSigBatch} from '../../helpers/deployment'
import {executeUsingMultiSig} from '../../helpers/deployment/multisig-helpers'
import {ethers} from 'ethers'

const {GNOSIS_SAFE, GOVERNOR} = Addresses.polygon

const QuickSwapExchange = 'QuickSwapExchange'
const SushiSwapExchange = 'SushiSwapExchange'
const RoutedSwapper = 'RoutedSwapper'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy, get, read, catchUnknownSigner} = deployments
  const {deployer: from} = await getNamedAccounts()

  const owner = GNOSIS_SAFE !== ethers.constants.AddressZero ? GNOSIS_SAFE : GOVERNOR

  const deployFunction = () =>
    deploy(RoutedSwapper, {
      from,
      log: true,
      proxy: {
        owner,
        proxyContract: 'OpenZeppelinTransparentProxy',
      },
    })

  const multiSigDeployTx = await catchUnknownSigner(deployFunction, {log: true})

  if (multiSigDeployTx) {
    await executeUsingMultiSig(hre, multiSigDeployTx)

    // Note: This second run will update `deployments/`, this will be necessary for later scripts that need new ABI
    // Refs: https://github.com/wighawag/hardhat-deploy/issues/178#issuecomment-918088504
    await deployFunction()
  }

  const {address: quickSwapExchangeAddress} = await get(QuickSwapExchange)
  const {address: sushiSwapExchangeAddress} = await get(SushiSwapExchange)

  if ((await read(RoutedSwapper, 'addressOf', [ExchangeType.QUICKSWAP])) !== quickSwapExchangeAddress) {
    await saveGovernorExecutionForMultiSigBatch(
      hre,
      RoutedSwapper,
      'setExchange',
      ExchangeType.QUICKSWAP,
      quickSwapExchangeAddress
    )
  }

  if ((await read(RoutedSwapper, 'addressOf', [ExchangeType.SUSHISWAP])) !== sushiSwapExchangeAddress) {
    await saveGovernorExecutionForMultiSigBatch(
      hre,
      RoutedSwapper,
      'setExchange',
      ExchangeType.SUSHISWAP,
      sushiSwapExchangeAddress
    )
  }
}

func.dependencies = [QuickSwapExchange, SushiSwapExchange]
func.tags = [RoutedSwapper]
export default func
