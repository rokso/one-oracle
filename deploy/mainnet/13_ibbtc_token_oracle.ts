import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'

const IbBtcTokenOracle = 'IbBtcTokenOracle'
const BTCPeggedTokenOracle = 'BTCPeggedTokenOracle'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy, get} = deployments
  const {deployer} = await getNamedAccounts()

  const {address: btcOracleAddress} = await get(BTCPeggedTokenOracle)

  await deploy(IbBtcTokenOracle, {
    from: deployer,
    log: true,
    args: [btcOracleAddress],
  })
}

export default func
func.dependencies = [BTCPeggedTokenOracle]
func.tags = [IbBtcTokenOracle]
