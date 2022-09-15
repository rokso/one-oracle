import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {Address} from '../../helpers'

const {WETH_ADDRESS} = Address.mainnet

const CTokenOracle = 'CTokenOracle'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy} = deployments
  const {deployer} = await getNamedAccounts()

  await deploy(CTokenOracle, {
    from: deployer,
    log: true,
    args: [WETH_ADDRESS],
  })
}

export default func
func.tags = [CTokenOracle]
