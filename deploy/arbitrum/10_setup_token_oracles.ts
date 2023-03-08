import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {setupTokenOracles} from '../../helpers/deployment'

const setupOracles = 'setupOracles'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  await setupTokenOracles(hre, {})
}

func.tags = [setupOracles]
export default func
