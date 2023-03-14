import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {ExchangeType} from '../../helpers'
import {Addresses} from '../../helpers/address'
import {saveGovernorExecutionForMultiSigBatch} from '../../helpers/deployment'
import {executeUsingMultiSig} from '../../helpers/deployment/multisig-helpers'
import {ethers} from 'ethers'

const {GNOSIS_SAFE, GOVERNOR} = Addresses.mainnet

const UniswapV2Exchange = 'UniswapV2Exchange'
const SushiswapExchange = 'SushiswapExchange'
const UniswapV3Exchange = 'UniswapV3Exchange'
const CurveExchange = 'CurveExchange'
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

  const {address: uniswapV2ExchangeAddress} = await get(UniswapV2Exchange)
  const {address: sushiswapExchangeAddress} = await get(SushiswapExchange)
  const {address: uniswapV3ExchangeAddress} = await get(UniswapV3Exchange)
  const {address: curveExchangeAddress} = await get(CurveExchange)

  if ((await read(RoutedSwapper, 'addressOf', [ExchangeType.UNISWAP_V2])) !== uniswapV2ExchangeAddress) {
    await saveGovernorExecutionForMultiSigBatch(
      hre,
      RoutedSwapper,
      'setExchange',
      ExchangeType.UNISWAP_V2,
      uniswapV2ExchangeAddress
    )
  }

  if ((await read(RoutedSwapper, 'addressOf', [ExchangeType.SUSHISWAP])) !== sushiswapExchangeAddress) {
    await saveGovernorExecutionForMultiSigBatch(
      hre,
      RoutedSwapper,
      'setExchange',
      ExchangeType.SUSHISWAP,
      sushiswapExchangeAddress
    )
  }

  if ((await read(RoutedSwapper, 'addressOf', [ExchangeType.UNISWAP_V3])) !== uniswapV3ExchangeAddress) {
    await saveGovernorExecutionForMultiSigBatch(
      hre,
      RoutedSwapper,
      'setExchange',
      ExchangeType.UNISWAP_V3,
      uniswapV3ExchangeAddress
    )
  }

  if ((await read(RoutedSwapper, 'addressOf', [ExchangeType.CURVE])) !== curveExchangeAddress) {
    await saveGovernorExecutionForMultiSigBatch(
      hre,
      RoutedSwapper,
      'setExchange',
      ExchangeType.CURVE,
      curveExchangeAddress
    )
  }
}

func.dependencies = [UniswapV2Exchange, SushiswapExchange, UniswapV3Exchange, CurveExchange]
func.tags = [RoutedSwapper]
export default func
