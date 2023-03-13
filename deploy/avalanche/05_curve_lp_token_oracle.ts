import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {Addresses} from '../../helpers/address'
const {avalanche: Address} = Addresses

const CurveLpTokenOracle = 'CurveLpTokenOracle'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy} = deployments
  const {deployer} = await getNamedAccounts()

  await deploy(CurveLpTokenOracle, {
    from: deployer,
    log: true,
    args: [Address.Curve.ADDRESS_PROVIDER],
  })
}

export default func

func.tags = [CurveLpTokenOracle]
