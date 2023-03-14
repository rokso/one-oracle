import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {Addresses, InitCodeHash} from '../../helpers'

const {TRADERJOE_FACTORY_ADDRESS, WAVAX: WAVAX_ADDRESS} = Addresses.avalanche
const TRADER_JOE_INIT_CODE_HASH = InitCodeHash[TRADERJOE_FACTORY_ADDRESS]

const UniswapV2LikeExchange = 'UniswapV2LikeExchange'
const TraderJoeExchange = 'TraderJoeExchange'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy} = deployments
  const {deployer: from} = await getNamedAccounts()

  if (!TRADER_JOE_INIT_CODE_HASH) throw new Error('Swap init code hash is missing')

  await deploy(TraderJoeExchange, {
    contract: UniswapV2LikeExchange,
    from,
    log: true,
    args: [TRADERJOE_FACTORY_ADDRESS, TRADER_JOE_INIT_CODE_HASH, WAVAX_ADDRESS],
  })
}

func.tags = [TraderJoeExchange]
export default func
