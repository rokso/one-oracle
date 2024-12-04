import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'

const MainAndFallbackOracle = 'MainAndFallbackOracle'
const RedstonePriceProvider = 'RedstonePriceProvider'
const ChainlinkPriceProvider = 'ChainlinkPriceProvider'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy, get} = deployments
  const {deployer: from} = await getNamedAccounts()

  const {address: mainAddress} = await get(RedstonePriceProvider)
  // Note: Redstone push oracle uses Chainlink interface
  const {address: fallbackAddress} = await get(ChainlinkPriceProvider)
  const stalePeriod = 24 * 60 * 60 // 24h

  await deploy(MainAndFallbackOracle, {
    from,
    log: true,
    args: [mainAddress, fallbackAddress, stalePeriod],
  })
}

func.dependencies = [ChainlinkPriceProvider, RedstonePriceProvider]
func.tags = [MainAndFallbackOracle]
export default func
