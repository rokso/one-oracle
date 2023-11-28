import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {Addresses} from '../../helpers'

const VTokenFraxLendOracle = 'VTokenFraxLendOracle'

const {
  Vesper: {vaDAI, vaETH, vaUSDC, vastETH},
  Chainlink: {
    CHAINLINK_USDC_USD_AGGREGATOR,
    CHAINLINK_DAI_USD_AGGREGATOR,
    CHAINLINK_ETH_USD_AGGREGATOR,
    CHAINLINK_STETH_USD_AGGREGATOR,
  },
} = Addresses.mainnet

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy} = deployments
  const {deployer} = await getNamedAccounts()

  await deploy('VTokenFraxLendOracle_vaUSDC', {
    contract: VTokenFraxLendOracle,
    from: deployer,
    log: true,
    args: [CHAINLINK_USDC_USD_AGGREGATOR, vaUSDC],
  })

  await deploy('VTokenFraxLendOracle_vaDAI', {
    contract: VTokenFraxLendOracle,
    from: deployer,
    log: true,
    args: [CHAINLINK_DAI_USD_AGGREGATOR, vaDAI],
  })

  await deploy('VTokenFraxLendOracle_vaETH', {
    contract: VTokenFraxLendOracle,
    from: deployer,
    log: true,
    args: [CHAINLINK_ETH_USD_AGGREGATOR, vaETH],
  })

  await deploy('VTokenFraxLendOracle_vastETH', {
    contract: VTokenFraxLendOracle,
    from: deployer,
    log: true,
    args: [CHAINLINK_STETH_USD_AGGREGATOR, vastETH],
  })
}

export default func
func.tags = [VTokenFraxLendOracle]
