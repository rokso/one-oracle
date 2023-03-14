import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {Addresses} from '../../helpers/index'

const {WETH} = Addresses.mainnet

const UniswapV3Exchange = 'UniswapV3Exchange'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy} = deployments
  const {deployer: from} = await getNamedAccounts()

  await deploy(UniswapV3Exchange, {
    from,
    log: true,
    args: [WETH],
  })
}

func.tags = [UniswapV3Exchange]
export default func
