import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'

const PythPriceProvider = 'PythPriceProvider'
const PullOracle = 'PullOracle'
const PythOracle = 'PythOracle'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy, get} = deployments
  const {deployer: from} = await getNamedAccounts()

  const {address: pythAddress} = await get(PythPriceProvider)

  await deploy(PythOracle, {
    contract: PullOracle,
    from,
    log: true,
    args: [pythAddress],
  })
}

func.tags = [PythOracle]
func.dependencies = [PythPriceProvider]
export default func
