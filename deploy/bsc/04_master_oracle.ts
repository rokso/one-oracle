import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {saveGovernorExecutionForMultiSigBatch} from '../../helpers/deployment'

const MasterOracle = 'MasterOracle'
const ChainlinkOracle = 'ChainlinkOracle'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy, get, read} = deployments
  const {deployer: from} = await getNamedAccounts()

  const {address: defaultOracleAddress} = await get(ChainlinkOracle)

  await deploy(MasterOracle, {
    from,
    // Note: `hardhat-deploy` will try to redeploy it because we recently changed the `defaultOracleAddress`
    // We don't want this because the code still the same and we have a setter for this
    // TODO: Replace this flag by checking deployed vs local code and skip deployment if they're the same
    skipIfAlreadyDeployed: true,
    log: true,
    args: [defaultOracleAddress],
  })

  if ((await read(MasterOracle, 'defaultOracle')) !== defaultOracleAddress) {
    await saveGovernorExecutionForMultiSigBatch(hre, MasterOracle, 'updateDefaultOracle', defaultOracleAddress)
  }
}

func.dependencies = [ChainlinkOracle]
func.tags = [MasterOracle]
export default func
