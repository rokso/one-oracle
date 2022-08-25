/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import hre, {deployments, ethers} from 'hardhat'
import {
  ChainlinkAvalanchePriceProvider__factory,
  PriceProvidersAggregator__factory,
  ChainlinkAvalanchePriceProvider,
  PriceProvidersAggregator,
  UniswapV2LikeExchange,
  UniswapV3Exchange,
  RoutedSwapper,
  RoutedSwapper__factory,
  UniswapV2LikeExchange__factory,
  UniswapV3Exchange__factory,
  VspMainnetOracle__factory,
  VspMainnetOracle,
  ChainlinkOracle__factory,
  ChainlinkOracle,
  AddressProvider__factory,
  AddressProvider,
} from '../typechain-types'
import {Address, SwapType, Provider, ExchangeType} from '../helpers'
import {impersonateAccount, increaseTime, parseEther, resetFork, toUSD} from './helpers'
import {IERC20} from '../typechain-types/@openzeppelin/contracts/token/ERC20'
import {IERC20__factory} from '../typechain-types/factories/@openzeppelin/contracts/token/ERC20'
import {adjustBalance} from './helpers/balance'

describe('Deployments ', function () {
  let snapshotId: string
  let deployer: SignerWithAddress

  before(async function () {
    // Reset fork to clean up fake `AddressProvider` contract from other test suites
    await resetFork()
  })

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    deployer = await impersonateAccount(Address.DEPLOYER)
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('@avalanche', function () {
    let addressProvider: AddressProvider
    let chainlinkAvalanchePriceProvider: ChainlinkAvalanchePriceProvider
    let priceProvidersAggregator: PriceProvidersAggregator
    let chainlinkOracle: ChainlinkOracle

    const {WETH_ADDRESS} = Address.avalanche

    beforeEach(async function () {
      // Setting the folder to execute deployment scripts from
      hre.network.deploy = ['deploy/avalanche']

      // eslint-disable-next-line no-shadow
      const {AddressProvider, ChainlinkAvalanchePriceProvider, PriceProvidersAggregator, ChainlinkOracle} =
        await deployments.fixture()

      addressProvider = AddressProvider__factory.connect(AddressProvider.address, deployer)
      chainlinkAvalanchePriceProvider = ChainlinkAvalanchePriceProvider__factory.connect(
        ChainlinkAvalanchePriceProvider.address,
        deployer
      )
      priceProvidersAggregator = PriceProvidersAggregator__factory.connect(PriceProvidersAggregator.address, deployer)
      chainlinkOracle = ChainlinkOracle__factory.connect(ChainlinkOracle.address, deployer)
    })

    it('AddressProvider', async function () {
      expect(addressProvider.address).eq(Address.ADDRESS_PROVIDER)
      expect(await addressProvider.governor()).eq(deployer.address)
    })

    it('ChainlinkAvalanchePriceProvider', async function () {
      const {_priceInUsd: price} = await chainlinkAvalanchePriceProvider.getPriceInUsd(WETH_ADDRESS)
      expect(price).eq(toUSD('3,251.6014'))
    })

    it('PriceProvidersAggregator', async function () {
      const {_priceInUsd: priceInUsd} = await priceProvidersAggregator.getPriceInUsd(Provider.CHAINLINK, WETH_ADDRESS)
      expect(priceInUsd).eq(toUSD('3,251.6014'))
    })

    it('ChainlinkOracle', async function () {
      const priceInUsd = await chainlinkOracle.getPriceInUsd(WETH_ADDRESS)
      expect(priceInUsd).eq(toUSD('3,251.6014'))
    })
  })

  describe('@mainnet', function () {
    let addressProvider: AddressProvider
    let uniswapV2Exchange: UniswapV2LikeExchange
    let sushiswapExchange: UniswapV2LikeExchange
    let uniswapV3Exchange: UniswapV3Exchange
    let routedSwapper: RoutedSwapper
    let weth: IERC20
    let dai: IERC20
    let vspOracle: VspMainnetOracle

    const {WETH_ADDRESS, DAI_ADDRESS, VSP_ADDRESS} = Address.mainnet

    beforeEach(async function () {
      // Setting the folder to execute deployment scripts from
      hre.network.deploy = ['deploy/mainnet']

      // eslint-disable-next-line no-shadow
      const {AddressProvider, UniswapV2Exchange, SushiswapExchange, UniswapV3Exchange, RoutedSwapper, VspOracle} =
        await deployments.fixture()

      addressProvider = AddressProvider__factory.connect(AddressProvider.address, deployer)
      uniswapV2Exchange = UniswapV2LikeExchange__factory.connect(UniswapV2Exchange.address, deployer)
      sushiswapExchange = UniswapV2LikeExchange__factory.connect(SushiswapExchange.address, deployer)
      uniswapV3Exchange = UniswapV3Exchange__factory.connect(UniswapV3Exchange.address, deployer)
      routedSwapper = RoutedSwapper__factory.connect(RoutedSwapper.address, deployer)
      weth = IERC20__factory.connect(WETH_ADDRESS, deployer)
      dai = IERC20__factory.connect(DAI_ADDRESS, deployer)
      vspOracle = VspMainnetOracle__factory.connect(VspOracle.address, deployer)

      await adjustBalance(WETH_ADDRESS, deployer.address, parseEther('1000'))
    })

    it('AddressProvider', async function () {
      expect(addressProvider.address).eq(Address.ADDRESS_PROVIDER)
      expect(await addressProvider.governor()).eq(deployer.address)
    })

    it('UniswapV2Exchange', async function () {
      const {_amountOut} = await uniswapV2Exchange.callStatic.getBestAmountOut(
        WETH_ADDRESS,
        DAI_ADDRESS,
        parseEther('1')
      )
      expect(_amountOut).closeTo(parseEther('3,222'), parseEther('1'))
    })

    it('SushiswapExchange', async function () {
      const {_amountOut} = await sushiswapExchange.callStatic.getBestAmountOut(
        WETH_ADDRESS,
        DAI_ADDRESS,
        parseEther('1')
      )
      expect(_amountOut).closeTo(parseEther('3,228'), parseEther('1'))
    })

    it('UniswapV3Exchange', async function () {
      const {_amountOut} = await uniswapV3Exchange.callStatic.getBestAmountOut(
        WETH_ADDRESS,
        DAI_ADDRESS,
        parseEther('1')
      )
      expect(_amountOut).closeTo(parseEther('3,227'), parseEther('1'))
    })

    it('RoutedSwapper', async function () {
      // given
      const path = ethers.utils.defaultAbiCoder.encode(['address[]'], [[WETH_ADDRESS, DAI_ADDRESS]])
      await routedSwapper.setDefaultRouting(
        SwapType.EXACT_INPUT,
        WETH_ADDRESS,
        DAI_ADDRESS,
        ExchangeType.UNISWAP_V2,
        path
      )
      await weth.approve(routedSwapper.address, ethers.constants.MaxUint256)

      // when
      const amountIn = parseEther('1')
      const tx = () => routedSwapper.swapExactInput(WETH_ADDRESS, DAI_ADDRESS, amountIn, 0, deployer.address)

      // then
      await expect(tx).changeTokenBalance(dai, deployer, '3222760582677952358944') // ~3,227 DAI
    })

    it('VspMainnetOracle', async function () {
      // given
      await increaseTime(ethers.BigNumber.from(60 * 60 * 3))
      await vspOracle.update()

      // when
      const price = await vspOracle.getPriceInUsd(VSP_ADDRESS)

      // then
      expect(price).closeTo(parseEther('1.88'), parseEther('0.01'))
    })
  })

  describe('@arbitrum', function () {
    let addressProvider: AddressProvider

    beforeEach(async function () {
      // Setting the folder to execute deployment scripts from
      hre.network.deploy = ['deploy/arbitrum']

      // eslint-disable-next-line no-shadow
      const {AddressProvider} = await deployments.fixture()

      addressProvider = AddressProvider__factory.connect(AddressProvider.address, deployer)
    })

    it('AddressProvider', async function () {
      expect(addressProvider.address).eq(Address.ADDRESS_PROVIDER)
      expect(await addressProvider.governor()).eq(deployer.address)
    })
  })

  describe('@polygon', function () {
    let addressProvider: AddressProvider

    beforeEach(async function () {
      // Setting the folder to execute deployment scripts from
      hre.network.deploy = ['deploy/polygon']

      // eslint-disable-next-line no-shadow
      const {AddressProvider} = await deployments.fixture()

      addressProvider = AddressProvider__factory.connect(AddressProvider.address, deployer)
    })

    it('AddressProvider', async function () {
      expect(addressProvider.address).eq(Address.ADDRESS_PROVIDER)
      expect(await addressProvider.governor()).eq(deployer.address)
    })
  })
})
