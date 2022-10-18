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
  USDPeggedTokenOracle__factory,
  USDPeggedTokenOracle,
} from '../typechain-types'
import {Address, SwapType, Provider, ExchangeType} from '../helpers'
import {impersonateAccount, increaseTime, parseEther, resetFork, toUSD} from './helpers'
import {IERC20} from '../typechain-types/@openzeppelin/contracts/token/ERC20'
import {IERC20__factory} from '../typechain-types/factories/@openzeppelin/contracts/token/ERC20'
import {adjustBalance} from './helpers/balance'
import Quote from './helpers/quotes'

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
    let chainlinkPriceProvider: ChainlinkAvalanchePriceProvider
    let priceProvidersAggregator: PriceProvidersAggregator
    let chainlinkOracle: ChainlinkOracle
    let msUsdOracle: USDPeggedTokenOracle

    const {WETH} = Address.avalanche

    beforeEach(async function () {
      // Setting the folder to execute deployment scripts from
      hre.network.deploy = ['deploy/avalanche']

      // eslint-disable-next-line no-shadow
      const {AddressProvider, ChainlinkPriceProvider, PriceProvidersAggregator, ChainlinkOracle, USDPeggedTokenOracle} =
        await deployments.fixture()

      addressProvider = AddressProvider__factory.connect(AddressProvider.address, deployer)
      chainlinkPriceProvider = ChainlinkAvalanchePriceProvider__factory.connect(
        ChainlinkPriceProvider.address,
        deployer
      )
      priceProvidersAggregator = PriceProvidersAggregator__factory.connect(PriceProvidersAggregator.address, deployer)
      chainlinkOracle = ChainlinkOracle__factory.connect(ChainlinkOracle.address, deployer)
      msUsdOracle = USDPeggedTokenOracle__factory.connect(USDPeggedTokenOracle.address, deployer)
    })

    it('AddressProvider', async function () {
      expect(await addressProvider.governor()).eq(deployer.address)
    })

    it('ChainlinkPriceProvider', async function () {
      const {_priceInUsd: price} = await chainlinkPriceProvider.getPriceInUsd(WETH)
      expect(price).closeTo(Quote.avalanche.ETH_USD, toUSD('1'))
    })

    it('PriceProvidersAggregator', async function () {
      const {_priceInUsd: priceInUsd} = await priceProvidersAggregator.getPriceInUsd(Provider.CHAINLINK, WETH)
      expect(priceInUsd).closeTo(Quote.avalanche.ETH_USD, toUSD('1'))
    })

    it('ChainlinkOracle', async function () {
      const priceInUsd = await chainlinkOracle.getPriceInUsd(WETH)
      expect(priceInUsd).closeTo(Quote.avalanche.ETH_USD, toUSD('1'))
    })

    it('USDPeggedTokenOracle', async function () {
      // Should always return 1 USD no matter the address given
      const priceInUsd = await msUsdOracle.getPriceInUsd(ethers.constants.AddressZero)
      expect(priceInUsd).eq(toUSD('1'))
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

    const {WETH, DAI, VSP} = Address.mainnet

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
      weth = IERC20__factory.connect(WETH, deployer)
      dai = IERC20__factory.connect(DAI, deployer)
      vspOracle = VspMainnetOracle__factory.connect(VspOracle.address, deployer)

      await adjustBalance(WETH, deployer.address, parseEther('1000'))
    })

    it('AddressProvider', async function () {
      expect(await addressProvider.governor()).eq(deployer.address)
    })

    it('UniswapV2Exchange', async function () {
      const {_amountOut} = await uniswapV2Exchange.callStatic.getBestAmountOut(WETH, DAI, parseEther('1'))
      expect(_amountOut).closeTo(Quote.mainnet.ETH_USD, parseEther('10'))
    })

    it('SushiswapExchange', async function () {
      const {_amountOut} = await sushiswapExchange.callStatic.getBestAmountOut(WETH, DAI, parseEther('1'))
      expect(_amountOut).closeTo(Quote.mainnet.ETH_USD, parseEther('10'))
    })

    it('UniswapV3Exchange', async function () {
      const {_amountOut} = await uniswapV3Exchange.callStatic.getBestAmountOut(WETH, DAI, parseEther('1'))
      expect(_amountOut).closeTo(Quote.mainnet.ETH_USD, parseEther('10'))
    })

    it('RoutedSwapper', async function () {
      // given
      const path = ethers.utils.defaultAbiCoder.encode(['address[]'], [[WETH, DAI]])
      await routedSwapper.setDefaultRouting(SwapType.EXACT_INPUT, WETH, DAI, ExchangeType.UNISWAP_V2, path)
      await weth.approve(routedSwapper.address, ethers.constants.MaxUint256)

      // when
      const amountIn = parseEther('1')
      const before = await dai.balanceOf(deployer.address)
      await routedSwapper.swapExactInput(WETH, DAI, amountIn, 0, deployer.address)
      const after = await dai.balanceOf(deployer.address)

      // then
      expect(after.sub(before)).closeTo(Quote.mainnet.ETH_USD, parseEther('10'))
    })

    it('VspMainnetOracle', async function () {
      // given
      await increaseTime(ethers.BigNumber.from(60 * 60 * 3))
      await vspOracle.update()

      // when
      const price = await vspOracle.getPriceInUsd(VSP)

      // then
      expect(price).closeTo(Quote.mainnet.VSP_USD, parseEther('0.01'))
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
      expect(await addressProvider.governor()).eq(deployer.address)
    })
  })

  describe('@polygon', function () {
    let addressProvider: AddressProvider
    let quickswapExchange: UniswapV2LikeExchange
    let sushiswapExchange: UniswapV2LikeExchange
    let routedSwapper: RoutedSwapper
    let wmatic: IERC20

    const {WMATIC, DAI} = Address.polygon

    beforeEach(async function () {
      // Setting the folder to execute deployment scripts from
      hre.network.deploy = ['deploy/polygon']

      // eslint-disable-next-line no-shadow
      const {AddressProvider, QuickSwapExchange, SushiSwapExchange, RoutedSwapper} = await deployments.fixture()

      addressProvider = AddressProvider__factory.connect(AddressProvider.address, deployer)
      quickswapExchange = UniswapV2LikeExchange__factory.connect(QuickSwapExchange.address, deployer)
      sushiswapExchange = UniswapV2LikeExchange__factory.connect(SushiSwapExchange.address, deployer)
      routedSwapper = RoutedSwapper__factory.connect(RoutedSwapper.address, deployer)
      wmatic = IERC20__factory.connect(WMATIC, deployer)

      await adjustBalance(WMATIC, deployer.address, parseEther('1000'))
    })

    it('AddressProvider', async function () {
      expect(await addressProvider.governor()).eq(deployer.address)
    })

    it('QuickSwapExchange', async function () {
      const {_amountOut} = await quickswapExchange.callStatic.getBestAmountOut(WMATIC, DAI, parseEther('1'))
      expect(_amountOut).closeTo(parseEther('1.39'), parseEther('1'))
    })

    it('SushiswapExchange', async function () {
      const {_amountOut} = await sushiswapExchange.callStatic.getBestAmountOut(WMATIC, DAI, parseEther('1'))
      expect(_amountOut).closeTo(parseEther('1.39'), parseEther('1'))
    })

    it('RoutedSwapper', async function () {
      // given
      const path = ethers.utils.defaultAbiCoder.encode(['address[]'], [[WMATIC, DAI]])
      await routedSwapper.setDefaultRouting(SwapType.EXACT_INPUT, WMATIC, DAI, ExchangeType.SUSHISWAP, path)
      await wmatic.approve(routedSwapper.address, ethers.constants.MaxUint256)

      // when
      const amountIn = parseEther('1')
      const before = await wmatic.balanceOf(deployer.address)
      await routedSwapper.swapExactInput(WMATIC, DAI, amountIn, 0, deployer.address)
      const after = await wmatic.balanceOf(deployer.address)

      // then
      expect(after.sub(before)).closeTo(Quote.polygon.MATIC_USD, parseEther('10'))
    })
  })
})
