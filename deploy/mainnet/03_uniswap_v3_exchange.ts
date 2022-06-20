import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {Address} from '../../helpers/index'

const {WETH_ADDRESS} = Address.mainnet

const UniswapV3Exchange = 'UniswapV3Exchange'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy} = deployments
  const {deployer} = await getNamedAccounts()

  await deploy(UniswapV3Exchange, {
    from: deployer,
    log: true,
    args: [WETH_ADDRESS],
  })
}

export default func
func.tags = ['mainnet', UniswapV3Exchange]
