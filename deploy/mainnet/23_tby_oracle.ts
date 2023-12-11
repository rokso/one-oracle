import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {Addresses} from '../../helpers'

const {
  Bloom: {EXCHANGE_REGISTRY},
} = Addresses.mainnet

const TBYOracle = 'TBYOracle'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy} = deployments
  const {deployer} = await getNamedAccounts()

  await deploy(TBYOracle, {
    from: deployer,
    log: true,
    args: [EXCHANGE_REGISTRY],
  })
}

export default func
func.tags = [TBYOracle]
