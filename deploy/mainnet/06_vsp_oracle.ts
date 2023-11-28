import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {parseEther} from '@ethersproject/units'

const VspMainnetOracle = 'VspMainnetOracle'
const VspOracle = 'VspOracle'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy} = deployments
  const {deployer: from} = await getNamedAccounts()

  const stalePeriod = 60 * 60 * 2 // 2 hours
  const maxDeviation = parseEther('0.05') // 5%

  await deploy(VspOracle, {
    contract: VspMainnetOracle,
    from,
    log: true,
    args: [maxDeviation, stalePeriod],
  })
}

func.tags = [VspOracle]
export default func
