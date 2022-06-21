/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {deployments, ethers} from 'hardhat'
import {
  ChainlinkAvalanchePriceProvider__factory,
  PriceProvidersAggregator__factory,
  UmbrellaPriceProvider__factory,
  SynthOracle__factory,
  ChainlinkAvalanchePriceProvider,
  PriceProvidersAggregator,
  SynthOracle,
  UmbrellaPriceProvider,
  ERC20Mock,
  ERC20Mock__factory,
  UniswapV2LikeExchange,
  UniswapV3Exchange,
  Swapper,
  Swapper__factory,
  UniswapV2LikeExchange__factory,
  UniswapV3Exchange__factory,
} from '../typechain-types'
import {Address, SwapType, Provider, ExchangeType} from '../helpers'
import {parseEther, toUSD} from './helpers'
import {IERC20} from '../typechain-types/@openzeppelin/contracts/token/ERC20'
import {IERC20__factory} from '../typechain-types/factories/@openzeppelin/contracts/token/ERC20'
import {adjustBalance} from './helpers/balance'

describe('Deployments ', function () {
  let snapshotId: string
  let deployer: SignerWithAddress

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer] = await ethers.getSigners()
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('@avalanche', function () {
    let chainlinkAvalanchePriceProvider: ChainlinkAvalanchePriceProvider
    let umbrellaPriceProvider: UmbrellaPriceProvider
    let priceProvidersAggregator: PriceProvidersAggregator
    let synthOracle: SynthOracle
    let vsETH: ERC20Mock

    const {WETH_ADDRESS} = Address.avalanche

    beforeEach(async function () {
      // eslint-disable-next-line no-shadow
      const {ChainlinkAvalanchePriceProvider, UmbrellaPriceProvider, PriceProvidersAggregator, SynthOracle} =
        await deployments.fixture(['avalanche'])
      chainlinkAvalanchePriceProvider = ChainlinkAvalanchePriceProvider__factory.connect(
        ChainlinkAvalanchePriceProvider.address,
        deployer
      )
      umbrellaPriceProvider = UmbrellaPriceProvider__factory.connect(UmbrellaPriceProvider.address, deployer)
      priceProvidersAggregator = PriceProvidersAggregator__factory.connect(PriceProvidersAggregator.address, deployer)
      synthOracle = SynthOracle__factory.connect(SynthOracle.address, deployer)

      await umbrellaPriceProvider.updateKeyOfToken(WETH_ADDRESS, 'ETH-USD')

      const ERC20MockFactory = new ERC20Mock__factory(deployer)
      vsETH = await ERC20MockFactory.deploy('vsETH', 'vsETH')
      await synthOracle.addOrUpdateAsset(vsETH.address, WETH_ADDRESS)
    })

    it('ChainlinkAvalanchePriceProvider', async function () {
      const {_priceInUsd: price} = await chainlinkAvalanchePriceProvider.getPriceInUsd(WETH_ADDRESS)
      expect(price).eq(toUSD('3,251.6014'))
    })

    it('UmbrellaPriceProvider', async function () {
      const {_priceInUsd: price} = await umbrellaPriceProvider.getPriceInUsd(WETH_ADDRESS)
      expect(price).eq(toUSD('3,244.47'))
    })

    it('PriceProvidersAggregator', async function () {
      const {_priceInUsd: chainlinkPrice} = await priceProvidersAggregator.getPriceInUsd(
        Provider.CHAINLINK,
        WETH_ADDRESS
      )
      expect(chainlinkPrice).eq(toUSD('3,251.6014'))

      const {_priceInUsd: umbrellaPrice} = await priceProvidersAggregator.getPriceInUsd(
        Provider.UMBRELLA_FIRST_CLASS,
        WETH_ADDRESS
      )
      expect(umbrellaPrice).eq(toUSD('3,244.47'))
    })

    it('SynthOracle', async function () {
      const price = await synthOracle.getPriceInUsd(vsETH.address)
      expect(price).eq(toUSD('3,251.6014'))
    })
  })

  describe('@mainnet', function () {
    let uniswapV2Exchange: UniswapV2LikeExchange
    let sushiswapExchange: UniswapV2LikeExchange
    let uniswapV3Exchange: UniswapV3Exchange
    let swapper: Swapper
    let weth: IERC20
    let dai: IERC20

    const {WETH_ADDRESS, DAI_ADDRESS} = Address.mainnet

    beforeEach(async function () {
      // eslint-disable-next-line no-shadow
      const {UniswapV2Exchange, SushiswapExchange, UniswapV3Exchange, Swapper} = await deployments.fixture(['mainnet'])

      uniswapV2Exchange = UniswapV2LikeExchange__factory.connect(UniswapV2Exchange.address, deployer)
      sushiswapExchange = UniswapV2LikeExchange__factory.connect(SushiswapExchange.address, deployer)
      uniswapV3Exchange = UniswapV3Exchange__factory.connect(UniswapV3Exchange.address, deployer)
      swapper = Swapper__factory.connect(Swapper.address, deployer)
      weth = IERC20__factory.connect(WETH_ADDRESS, deployer)
      dai = IERC20__factory.connect(DAI_ADDRESS, deployer)

      await adjustBalance(WETH_ADDRESS, deployer.address, parseEther('1000'))
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

    it('Swapper', async function () {
      // given
      const path = ethers.utils.defaultAbiCoder.encode(['address[]'], [[WETH_ADDRESS, DAI_ADDRESS]])
      await swapper.setDefaultRouting(SwapType.EXACT_INPUT, WETH_ADDRESS, DAI_ADDRESS, ExchangeType.UNISWAP_V2, path)
      await weth.approve(swapper.address, ethers.constants.MaxUint256)

      // when
      const amountIn = parseEther('1')
      const tx = () =>
        swapper.swapExactInputWithDefaultRouting(WETH_ADDRESS, DAI_ADDRESS, amountIn, 0, deployer.address)

      // then
      await expect(tx).changeTokenBalance(dai, deployer, '3222760582677952358944') // ~3,227 DAI
    })
  })
})
