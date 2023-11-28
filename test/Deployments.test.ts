/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import hre, {deployments, ethers} from 'hardhat'
import {
  ChainlinkAvalanchePriceProvider,
  PriceProvidersAggregator,
  UniswapV2LikeExchange,
  UniswapV3Exchange,
  CurveExchange,
  RoutedSwapper,
  VspMainnetOracle,
  ChainlinkOracle,
  USDPeggedTokenOracle,
  IERC20,
} from '../typechain-types'
import {Addresses, SwapType, Provider, ExchangeType} from '../helpers'
import {impersonateAccount, increaseTime, parseEther, resetFork, toUSD} from './helpers'
import {adjustBalance} from './helpers/balance'
import Quote from './helpers/quotes'
import {smock} from '@defi-wonderland/smock'

const AddressProvider = 'IAddressProvider'

describe('Deployments ', function () {
  let snapshotId: string
  let deployer: SignerWithAddress

  before(async function () {
    // Reset fork to clean up fake `AddressProvider` contract from other test suites
    await resetFork()
  })

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    deployer = await impersonateAccount(Addresses.DEPLOYER)
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('@avalanche', function () {
    let chainlinkPriceProvider: ChainlinkAvalanchePriceProvider
    let priceProvidersAggregator: PriceProvidersAggregator
    let chainlinkOracle: ChainlinkOracle
    let msUsdOracle: USDPeggedTokenOracle

    const {WETH} = Addresses.avalanche

    beforeEach(async function () {
      // Setting the folder to execute deployment scripts from
      hre.network.deploy = ['deploy/avalanche']

      // eslint-disable-next-line no-shadow
      const {ChainlinkPriceProvider, PriceProvidersAggregator, ChainlinkOracle, USDPeggedTokenOracle} =
        await deployments.fixture()

      chainlinkPriceProvider = await ethers.getContractAt(
        'ChainlinkAvalanchePriceProvider',
        ChainlinkPriceProvider.address,
        deployer
      )
      priceProvidersAggregator = await ethers.getContractAt(
        'PriceProvidersAggregator',
        PriceProvidersAggregator.address,
        deployer
      )
      chainlinkOracle = await ethers.getContractAt('ChainlinkOracle', ChainlinkOracle.address, deployer)
      msUsdOracle = await ethers.getContractAt('USDPeggedTokenOracle', USDPeggedTokenOracle.address, deployer)
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
    let uniswapV2Exchange: UniswapV2LikeExchange
    let sushiswapExchange: UniswapV2LikeExchange
    let uniswapV3Exchange: UniswapV3Exchange
    let curveExchange: CurveExchange
    let routedSwapper: RoutedSwapper
    let weth: IERC20
    let dai: IERC20
    let vspOracle: VspMainnetOracle

    const {WETH, DAI, VSP, Curve} = Addresses.mainnet

    beforeEach(async function () {
      // Setting the folder to execute deployment scripts from
      hre.network.deploy = ['deploy/mainnet']

      // eslint-disable-next-line no-shadow
      const {UniswapV2Exchange, SushiswapExchange, UniswapV3Exchange, RoutedSwapper, VspOracle, CurveExchange} =
        await deployments.fixture()

      uniswapV2Exchange = await ethers.getContractAt('UniswapV2LikeExchange', UniswapV2Exchange.address, deployer)
      sushiswapExchange = await ethers.getContractAt('UniswapV2LikeExchange', SushiswapExchange.address, deployer)
      uniswapV3Exchange = await ethers.getContractAt('UniswapV3Exchange', UniswapV3Exchange.address, deployer)
      curveExchange = await ethers.getContractAt('CurveExchange', CurveExchange.address, deployer)
      routedSwapper = await ethers.getContractAt('RoutedSwapper', RoutedSwapper.address, deployer)
      weth = await ethers.getContractAt('@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20', WETH, deployer)
      dai = await ethers.getContractAt('@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20', DAI, deployer)
      vspOracle = await ethers.getContractAt('VspMainnetOracle', VspOracle.address, deployer)

      await adjustBalance(WETH, deployer.address, parseEther('1000'))
    })

    it('UniswapV2Exchange', async function () {
      const wethLike = await uniswapV2Exchange.wethLike()
      expect(wethLike).eq(WETH)
    })

    it('SushiswapExchange', async function () {
      const wethLike = await sushiswapExchange.wethLike()
      expect(wethLike).eq(WETH)
    })

    it('UniswapV3Exchange', async function () {
      const wethLike = await uniswapV3Exchange.wethLike()
      expect(wethLike).eq(WETH)
    })

    it('CurveExchange', async function () {
      expect(await curveExchange.addressProvider()).eq(Curve.ADDRESS_PROVIDER)
    })

    it('RoutedSwapper', async function () {
      // given
      const path = ethers.utils.defaultAbiCoder.encode(['address[]'], [[WETH, DAI]])
      const governor = await impersonateAccount(Addresses.mainnet.GNOSIS_SAFE)
      await routedSwapper
        .connect(governor)
        .setDefaultRouting(SwapType.EXACT_INPUT, WETH, DAI, ExchangeType.UNISWAP_V2, path)
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

  describe('@polygon', function () {
    let quickswapExchange: UniswapV2LikeExchange
    let sushiswapExchange: UniswapV2LikeExchange
    let routedSwapper: RoutedSwapper
    let wmatic: IERC20

    const {WMATIC, DAI} = Addresses.polygon

    beforeEach(async function () {
      // Setting the folder to execute deployment scripts from
      hre.network.deploy = ['deploy/polygon']

      // eslint-disable-next-line no-shadow
      const {QuickSwapExchange, SushiSwapExchange, RoutedSwapper} = await deployments.fixture()

      quickswapExchange = await ethers.getContractAt('UniswapV2LikeExchange', QuickSwapExchange.address, deployer)
      sushiswapExchange = await ethers.getContractAt('UniswapV2LikeExchange', SushiSwapExchange.address, deployer)
      routedSwapper = await ethers.getContractAt('RoutedSwapper', RoutedSwapper.address, deployer)
      wmatic = await ethers.getContractAt('@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20', WMATIC, deployer)

      await adjustBalance(WMATIC, deployer.address, parseEther('1000'))
    })

    it('QuickSwapExchange', async function () {
      const wethLike = await quickswapExchange.wethLike()
      expect(wethLike).eq(WMATIC)
    })

    it('SushiswapExchange', async function () {
      const wethLike = await sushiswapExchange.wethLike()
      expect(wethLike).eq(WMATIC)
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

  describe('@optimism', function () {
    let priceProvidersAggregator: PriceProvidersAggregator
    let chainlinkOracle: ChainlinkOracle
    let msUsdOracle: USDPeggedTokenOracle

    const {WETH, DAI, USDC, OP} = Addresses.optimism

    beforeEach(async function () {
      // Setting the folder to execute deployment scripts from
      hre.network.deploy = ['deploy/optimism']

      // eslint-disable-next-line no-shadow
      const {PriceProvidersAggregator, ChainlinkOracle, USDPeggedTokenOracle} = await deployments.fixture()

      priceProvidersAggregator = await ethers.getContractAt(
        'PriceProvidersAggregator',
        PriceProvidersAggregator.address,
        deployer
      )
      chainlinkOracle = await ethers.getContractAt('ChainlinkOracle', ChainlinkOracle.address, deployer)
      msUsdOracle = await ethers.getContractAt('USDPeggedTokenOracle', USDPeggedTokenOracle.address, deployer)

      // AddressProvider governor can update priceProvidersAggregator if not already set.
      const addressProvider = await ethers.getContractAt(AddressProvider, Addresses.ADDRESS_PROVIDER)
      if (
        (await addressProvider.governor()) === Addresses.DEPLOYER &&
        (await addressProvider.providersAggregator()) !== priceProvidersAggregator.address
      ) {
        await addressProvider.connect(deployer).updateProvidersAggregator(priceProvidersAggregator.address)
      }

      await adjustBalance(WETH, deployer.address, parseEther('1000'))
    })

    it('PriceProvidersAggregator', async function () {
      const {_priceInUsd: priceInUsd} = await priceProvidersAggregator.getPriceInUsd(Provider.CHAINLINK, WETH)
      expect(priceInUsd).closeTo(Quote.optimism.ETH_USD, toUSD('1'))

      const {_priceInUsd: usdcPriceInUsd} = await priceProvidersAggregator.getPriceInUsd(Provider.CHAINLINK, USDC)
      expect(usdcPriceInUsd).closeTo(Quote.optimism.USDC_USD, toUSD('0.1'))

      const {_priceInUsd: daiPriceInUsd} = await priceProvidersAggregator.getPriceInUsd(Provider.CHAINLINK, DAI)
      expect(daiPriceInUsd).closeTo(Quote.optimism.DAI_USD, toUSD('0.1'))

      const {_priceInUsd: opPriceInUsd} = await priceProvidersAggregator.getPriceInUsd(Provider.CHAINLINK, OP)
      expect(opPriceInUsd).closeTo(Quote.optimism.OP_USD, toUSD('0.1'))
    })

    it('ChainlinkOracle', async function () {
      const priceInUsd = await chainlinkOracle.getPriceInUsd(WETH)
      expect(priceInUsd).closeTo(Quote.optimism.ETH_USD, toUSD('1'))

      const usdcPriceInUsd = await chainlinkOracle.getPriceInUsd(USDC)
      expect(usdcPriceInUsd).closeTo(Quote.optimism.USDC_USD, toUSD('0.1'))

      const daiPriceInUsd = await chainlinkOracle.getPriceInUsd(DAI)
      expect(daiPriceInUsd).closeTo(Quote.optimism.DAI_USD, toUSD('0.1'))

      const opPriceInUsd = await chainlinkOracle.getPriceInUsd(OP)
      expect(opPriceInUsd).closeTo(Quote.optimism.OP_USD, toUSD('0.1'))
    })

    it('USDPeggedTokenOracle', async function () {
      // Should always return 1 USD no matter the address given
      const priceInUsd = await msUsdOracle.getPriceInUsd(ethers.constants.AddressZero)
      expect(priceInUsd).eq(toUSD('1'))
    })
  })

  describe('@arbitrum', function () {
    let priceProvidersAggregator: PriceProvidersAggregator
    let chainlinkOracle: ChainlinkOracle

    const {WETH, DAI, USDC} = Addresses.arbitrum

    beforeEach(async function () {
      // TODO: Remove this mock after having `AddressProvider` contract deployed to the arbitrum chain
      const addressProvider = await smock.fake('AddressProviderMock', {address: Addresses.ADDRESS_PROVIDER})
      addressProvider.governor.returns(deployer.address)
      // Note: Address 'Transaction reverted: function call to a non-contract account' error
      await hre.network.provider.send('hardhat_setCode', [Addresses.ADDRESS_PROVIDER, '0x01'])

      // Setting the folder to execute deployment scripts from
      hre.network.deploy = ['deploy/arbitrum']

      // eslint-disable-next-line no-shadow
      const {PriceProvidersAggregator, ChainlinkOracle} = await deployments.fixture()

      priceProvidersAggregator = await ethers.getContractAt(
        'PriceProvidersAggregator',
        PriceProvidersAggregator.address,
        deployer
      )
      chainlinkOracle = await ethers.getContractAt('ChainlinkOracle', ChainlinkOracle.address, deployer)

      addressProvider.providersAggregator.returns(priceProvidersAggregator.address)
    })

    it('PriceProvidersAggregator', async function () {
      const {_priceInUsd: priceInUsd} = await priceProvidersAggregator.getPriceInUsd(Provider.CHAINLINK, WETH)
      expect(priceInUsd).closeTo(Quote.arbitrum.ETH_USD, toUSD('1'))

      const {_priceInUsd: usdcPriceInUsd} = await priceProvidersAggregator.getPriceInUsd(Provider.CHAINLINK, USDC)
      expect(usdcPriceInUsd).closeTo(Quote.arbitrum.USDC_USD, toUSD('0.1'))

      const {_priceInUsd: daiPriceInUsd} = await priceProvidersAggregator.getPriceInUsd(Provider.CHAINLINK, DAI)
      expect(daiPriceInUsd).closeTo(Quote.arbitrum.DAI_USD, toUSD('0.1'))
    })

    it('ChainlinkOracle', async function () {
      const priceInUsd = await chainlinkOracle.getPriceInUsd(WETH)
      expect(priceInUsd).closeTo(Quote.arbitrum.ETH_USD, toUSD('1'))

      const usdcPriceInUsd = await chainlinkOracle.getPriceInUsd(USDC)
      expect(usdcPriceInUsd).closeTo(Quote.arbitrum.USDC_USD, toUSD('0.1'))

      const daiPriceInUsd = await chainlinkOracle.getPriceInUsd(DAI)
      expect(daiPriceInUsd).closeTo(Quote.arbitrum.DAI_USD, toUSD('0.1'))
    })
  })
})
