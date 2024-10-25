import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'

const PythPriceProvider = 'PythPriceProvider'
const PythOracle = 'PythOracle'
const PullOracle = 'PullOracle'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy, get} = deployments
  const {deployer: from} = await getNamedAccounts()

  const {address: pythProviderAddress} = await get('PythPriceProvider')

  await deploy(PythOracle, {
    contract: PullOracle,
    from,
    log: true,
    args: [pythProviderAddress],
  })
}

func.tags = [PythOracle]
func.dependencies = [PythPriceProvider]
export default func
