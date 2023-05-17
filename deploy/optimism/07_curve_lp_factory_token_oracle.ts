import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {Addresses} from '../../helpers/address'

const {optimism: Address} = Addresses

const CurveFactoryLpTokenOracle = 'CurveFactoryLpTokenOracle'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy} = deployments
  const {deployer} = await getNamedAccounts()

  await deploy(CurveFactoryLpTokenOracle, {
    from: deployer,
    log: true,
    args: [Address.WETH],
  })
}

export default func

func.tags = [CurveFactoryLpTokenOracle]
