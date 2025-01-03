import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'

const MainAndFallbackOracle = 'MainAndFallbackOracle'
const RedstonePriceProvider = 'RedstonePriceProvider'
const RedstonePushPriceProvider = 'RedstonePushPriceProvider'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy, get} = deployments
  const {deployer: from} = await getNamedAccounts()

  const {address: mainAddress} = await get(RedstonePriceProvider)
  const {address: fallbackAddress} = await get(RedstonePushPriceProvider)
  const stalePeriod = 24 * 60 * 60 // 24h

  await deploy(MainAndFallbackOracle, {
    from,
    log: true,
    args: [mainAddress, fallbackAddress, stalePeriod],
  })
}

func.dependencies = [RedstonePushPriceProvider, RedstonePriceProvider]
func.tags = [MainAndFallbackOracle]
export default func
