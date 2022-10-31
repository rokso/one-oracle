import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import Addresses from '../../helpers/address'
import {setupTokenOracles} from '../../helpers/deployment'

const {bsc: Address} = Addresses

const curveLpTokens = [{token: Address.Ellipsis.VAL_3EPS_LP, isLending: false}]

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  await setupTokenOracles(hre, {curveLpTokens})
}

export default func
