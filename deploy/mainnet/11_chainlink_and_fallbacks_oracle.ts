import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {parseEther} from '@ethersproject/units'
import {Provider} from '../../helpers'

const ChainlinkAndFallbacksOracle = 'ChainlinkAndFallbacksOracle'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy} = deployments
  const {deployer: from} = await getNamedAccounts()

  const stalePeriod = 60 * 60 * 4 // 4 hours
  const maxFallbacksDeviation = parseEther('0.05') // 5%

  await deploy(ChainlinkAndFallbacksOracle, {
    from,
    log: true,
    args: [maxFallbacksDeviation, stalePeriod, Provider.UNISWAP_V2, Provider.SUSHISWAP],
  })
}

func.tags = [ChainlinkAndFallbacksOracle]
export default func
