import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import chalk from 'chalk'

const MasterOracle = 'MasterOracle'
const ChainlinkAndFallbacksOracle = 'ChainlinkAndFallbacksOracle'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy, get} = deployments
  const {deployer: from} = await getNamedAccounts()

  const {address: defaultOracleAddress} = await get(ChainlinkAndFallbacksOracle)

  const {newlyDeployed} = await deploy(MasterOracle, {
    from,
    log: true,
    args: [defaultOracleAddress],
  })

  if (newlyDeployed) {
    console.log(chalk.red(`A new version of '${MasterOracle}' contract was deployed!`))
    // eslint-disable-next-line quotes
    console.log(chalk.red("Use 'TokenOracleUpdated' events from the older contract to setup it."))
  }
}

func.dependencies = [ChainlinkAndFallbacksOracle]
func.tags = [MasterOracle]
export default func
