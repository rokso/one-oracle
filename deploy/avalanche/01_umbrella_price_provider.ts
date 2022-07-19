import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {Address} from '../../helpers'

const {UMBRELLA_REGISTRY} = Address.avalanche

const UmbrellaPriceProvider = 'UmbrellaPriceProvider'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy} = deployments
  const {deployer} = await getNamedAccounts()

  await deploy(UmbrellaPriceProvider, {
    from: deployer,
    log: true,
    args: [UMBRELLA_REGISTRY],
  })
}

export default func
func.tags = [UmbrellaPriceProvider]
