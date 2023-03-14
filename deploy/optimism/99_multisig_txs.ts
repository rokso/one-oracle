import {DeployFunction} from 'hardhat-deploy/types'
import {executeBatchUsingMultisig} from '../../helpers/deployment/multisig-helpers'

const MultiSigTxs = 'MultiSigTxs'

const func: DeployFunction = executeBatchUsingMultisig

func.tags = [MultiSigTxs]
export default func
