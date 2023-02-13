import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {setupTokenOracles} from '../../helpers/deployment'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  await setupTokenOracles(hre, {})
}

export default func
