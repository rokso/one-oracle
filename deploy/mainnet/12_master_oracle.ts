import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'

const MasterOracle = 'MasterOracle'
const ChainlinkAndFallbacksOracle = 'ChainlinkAndFallbacksOracle'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy, get} = deployments
  const {deployer} = await getNamedAccounts()

  const {address: defaultOracleAddress} = await get(ChainlinkAndFallbacksOracle)

  await deploy(MasterOracle, {
    from: deployer,
    log: true,
    args: [defaultOracleAddress],
  })
}

export default func
func.dependencies = [ChainlinkAndFallbacksOracle]
func.tags = [MasterOracle]
