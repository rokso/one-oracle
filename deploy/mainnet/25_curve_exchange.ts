import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {Addresses} from '../../helpers/index'

const {ADDRESS_PROVIDER} = Addresses.mainnet.Curve

const CurveExchange = 'CurveExchange'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy} = deployments
  const {deployer: from} = await getNamedAccounts()

  await deploy(CurveExchange, {
    from,
    log: true,
    args: [ADDRESS_PROVIDER],
  })
}

func.tags = [CurveExchange]
export default func
