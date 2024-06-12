import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {Addresses} from '../../helpers/address'

const {mainnet: Address} = Addresses

const CurveLpTokenOracleV2 = 'CurveLpTokenOracleV2'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy} = deployments
  const {deployer} = await getNamedAccounts()

  await deploy(CurveLpTokenOracleV2, {from: deployer, log: true, args: [Address.WETH]})
}

export default func

func.tags = [CurveLpTokenOracleV2]
