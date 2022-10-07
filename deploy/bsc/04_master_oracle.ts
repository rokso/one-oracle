import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'

const MasterOracle = 'MasterOracle'
const ChainlinkOracle = 'ChainlinkOracle'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy, get} = deployments
  const {deployer: from} = await getNamedAccounts()

  const {address: defaultOracleAddress} = await get(ChainlinkOracle)

  await deploy(MasterOracle, {
    from,
    log: true,
    args: [defaultOracleAddress],
  })  
}

func.dependencies = [ChainlinkOracle]
func.tags = [MasterOracle]
export default func
