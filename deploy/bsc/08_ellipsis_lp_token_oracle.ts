import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import Addresses from '../../helpers/address'

const {bsc: Address} = Addresses

const EllipsisLpTokenOracle = 'EllipsisLpTokenOracle'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy} = deployments
  const {deployer} = await getNamedAccounts()

  await deploy(EllipsisLpTokenOracle, {
    from: deployer,
    log: true,
    args: [Address.Ellipsis.ADDRESS_PROVIDER],
  })
}

export default func

func.tags = [EllipsisLpTokenOracle]
