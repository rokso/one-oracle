import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {Addresses} from '../../helpers/address'

const {mainnet: Address} = Addresses

const PythPriceProvider = 'PythPriceProvider'
const PythMainnetPriceProvider = 'PythMainnetPriceProvider'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy} = deployments
  const {deployer: from} = await getNamedAccounts()

  await deploy(PythPriceProvider, {
    contract: PythMainnetPriceProvider,
    from,
    log: true,
    args: [Address.PYTH_ORACLE],
  })
}

func.tags = [PythPriceProvider]
export default func
