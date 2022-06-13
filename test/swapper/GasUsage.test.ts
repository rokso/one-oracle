/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {
  UniswapV2LikeExchange,
  UniswapV2LikeExchange__factory,
  UniswapV3Exchange,
  UniswapV3Exchange__factory,
  Swapper,
  Swapper__factory,
  IERC20,
  IERC20__factory,
  ChainlinkAndFallbacksOracle__factory,
  ChainlinkMainnetPriceProvider,
  ChainlinkMainnetPriceProvider__factory,
  PriceProvidersAggregator,
  PriceProvidersAggregator__factory,
  UniswapV3CrossPoolOracle__factory,
  UniswapV3PriceProvider,
  UniswapV3PriceProvider__factory,
  ChainlinkAndFallbacksOracle,
  UniswapV2LikePriceProvider,
  UniswapV2LikePriceProvider__factory,
  PriceProviderMock,
  PriceProviderMock__factory,
  StableCoinProvider__factory,
  StableCoinProvider,
} from '../../typechain-types'
import Address from '../../helpers/address'
import {ExchangeType, HOUR, increaseTime, parseEther, parseUnits, Provider, SwapType} from '../helpers'
import {adjustBalance} from '../helpers/balance'

const {
  WETH_ADDRESS,
  DAI_ADDRESS,
  WBTC_ADDRESS,
  USDC_ADDRESS,
  UNISWAP_V2_FACTORY_ADDRESS,
  UNISWAP_V2_ROUTER_ADDRESS,
  SUSHISWAP_ROUTER_ADDRESS,
  NOT_ON_CHAINLINK_TOKEN: BTT_ADDRESS,
} = Address.mainnet
const MAX_SLIPPAGE = parseEther('0.2')
const MAX_DEVIATION = parseEther('0.1') // 10%
const STALE_PERIOD = ethers.constants.MaxUint256
const DEFAULT_TWAP_PERIOD = HOUR
const DEFAULT_POOLS_FEE = 3000 // 0.3%

describe('GasUsage @mainnet', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let uniswapV2Exchange: UniswapV2LikeExchange
  let sushiswapExchange: UniswapV2LikeExchange
  let uniswapV3Exchange: UniswapV3Exchange
  let uniswapV3DefaultPoolFee: number
  let swapper: Swapper
  let weth: IERC20
  let dai: IERC20
  let wbtc: IERC20
  let usdc: IERC20
  let btt: IERC20
  let uniswapV2Provider: UniswapV2LikePriceProvider
  let uniswapV3Provider: UniswapV3PriceProvider
  let chainlinkProvider: ChainlinkMainnetPriceProvider
  let aggregator: PriceProvidersAggregator
  let chainlinkAndFallbacksOracle: ChainlinkAndFallbacksOracle
  let stableCoinProvider: StableCoinProvider

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer] = await ethers.getSigners()

    weth = IERC20__factory.connect(WETH_ADDRESS, deployer)
    dai = IERC20__factory.connect(DAI_ADDRESS, deployer)
    wbtc = IERC20__factory.connect(WBTC_ADDRESS, deployer)
    usdc = IERC20__factory.connect(USDC_ADDRESS, deployer)
    btt = IERC20__factory.connect(BTT_ADDRESS, deployer)

    await adjustBalance(weth.address, deployer.address, parseEther('1,000,000'))
    await adjustBalance(dai.address, deployer.address, parseEther('1,000,000'))
    await adjustBalance(wbtc.address, deployer.address, parseUnits('1,000,000', 8))
    await adjustBalance(usdc.address, deployer.address, parseUnits('1,000,000', 6))
    await adjustBalance(usdc.address, deployer.address, parseUnits('1,000,000', 6))
    await adjustBalance(btt.address, deployer.address, parseEther('1,000,000,000,000'))

    //
    // Oracle Setup
    //
    const uniswapV2LikeExchangeFactory = new UniswapV2LikeExchange__factory(deployer)

    uniswapV2Exchange = await uniswapV2LikeExchangeFactory.deploy(UNISWAP_V2_ROUTER_ADDRESS, WETH_ADDRESS)
    await uniswapV2Exchange.deployed()

    sushiswapExchange = await uniswapV2LikeExchangeFactory.deploy(SUSHISWAP_ROUTER_ADDRESS, WETH_ADDRESS)
    await sushiswapExchange.deployed()

    const uniswapV3ExchangeFactory = new UniswapV3Exchange__factory(deployer)
    uniswapV3Exchange = await uniswapV3ExchangeFactory.deploy(WETH_ADDRESS)
    await uniswapV3Exchange.deployed()
    uniswapV3DefaultPoolFee = await uniswapV3Exchange.defaultPoolFee()

    const priceProviderFactory = new UniswapV2LikePriceProvider__factory(deployer)
    uniswapV2Provider = await priceProviderFactory.deploy(
      UNISWAP_V2_FACTORY_ADDRESS,
      DEFAULT_TWAP_PERIOD,
      WETH_ADDRESS,
      ethers.constants.AddressZero
    )
    await uniswapV2Provider.deployed()

    await uniswapV2Provider['updateOrAdd(address,address)'](DAI_ADDRESS, WETH_ADDRESS)
    await uniswapV2Provider['updateOrAdd(address,address)'](WBTC_ADDRESS, WETH_ADDRESS)
    await uniswapV2Provider['updateOrAdd(address,address)'](USDC_ADDRESS, WETH_ADDRESS)

    await increaseTime(DEFAULT_TWAP_PERIOD)

    await uniswapV2Provider['updateOrAdd(address,address)'](DAI_ADDRESS, WETH_ADDRESS)
    await uniswapV2Provider['updateOrAdd(address,address)'](WBTC_ADDRESS, WETH_ADDRESS)
    await uniswapV2Provider['updateOrAdd(address,address)'](USDC_ADDRESS, WETH_ADDRESS)

    const crossPoolOracleFactory = new UniswapV3CrossPoolOracle__factory(deployer)
    const crossPoolOracle = await crossPoolOracleFactory.deploy(weth.address)
    await crossPoolOracle.deployed()

    const uniswapV3ProviderFactory = new UniswapV3PriceProvider__factory(deployer)
    uniswapV3Provider = await uniswapV3ProviderFactory.deploy(
      crossPoolOracle.address,
      DEFAULT_TWAP_PERIOD,
      DEFAULT_POOLS_FEE,
      ethers.constants.AddressZero
    )
    await uniswapV3Provider.deployed()

    const chainlinkProviderFactory = new ChainlinkMainnetPriceProvider__factory(deployer)
    chainlinkProvider = await chainlinkProviderFactory.deploy()
    await chainlinkProvider.deployed()

    const aggregatorProviderFactory = new PriceProvidersAggregator__factory(deployer)
    aggregator = await aggregatorProviderFactory.deploy(WETH_ADDRESS)
    await aggregator.deployed()

    await aggregator.setPriceProvider(Provider.UNISWAP_V3, uniswapV3Provider.address)
    await aggregator.setPriceProvider(Provider.CHAINLINK, chainlinkProvider.address)

    const chainlinkAndFallbacksOracleFactory = new ChainlinkAndFallbacksOracle__factory(deployer)
    chainlinkAndFallbacksOracle = await chainlinkAndFallbacksOracleFactory.deploy(
      aggregator.address,
      MAX_DEVIATION,
      STALE_PERIOD,
      Provider.UNISWAP_V3,
      Provider.UNISWAP_V2
    )

    const stableCoinProviderFactory = new StableCoinProvider__factory(deployer)
    stableCoinProvider = await stableCoinProviderFactory.deploy(
      USDC_ADDRESS,
      DAI_ADDRESS,
      aggregator.address,
      STALE_PERIOD,
      MAX_DEVIATION
    )
    await stableCoinProvider.deployed()
    await uniswapV2Provider.updateStableCoinProvider(stableCoinProvider.address)
    await uniswapV3Provider.updateStableCoinProvider(stableCoinProvider.address)

    //
    // Swapper Setup
    //
    const swapperFactory = new Swapper__factory(deployer)
    swapper = await swapperFactory.deploy(chainlinkAndFallbacksOracle.address, MAX_SLIPPAGE)
    await swapper.deployed()

    await swapper.setExchange(ExchangeType.UNISWAP_V2, uniswapV2Exchange.address)
    await swapper.setExchange(ExchangeType.SUSHISWAP, sushiswapExchange.address)
    await swapper.setExchange(ExchangeType.UNISWAP_V3, uniswapV3Exchange.address)
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('oracle.quote()', function () {
    let priceProviderMock: PriceProviderMock

    beforeEach(async function () {
      const priceProviderMockFactory = new PriceProviderMock__factory(deployer)
      priceProviderMock = await priceProviderMockFactory.deploy()
    })

    it('chainlink price provider', async function () {
      const amountIn = parseUnits('1', 8)
      const tx = await priceProviderMock.checkGasOfQuote(
        chainlinkProvider.address,
        WBTC_ADDRESS,
        WETH_ADDRESS,
        amountIn
      )
      const receipt = await tx.wait()
      expect(receipt.gasUsed).eq('81979')
    })

    describe('2 length path', function () {
      it('uniswapV2 price provider', async function () {
        const amountIn = parseUnits('1', 8)
        const tx = await priceProviderMock.checkGasOfQuote(
          uniswapV2Provider.address,
          WBTC_ADDRESS,
          WETH_ADDRESS,
          amountIn
        )
        const receipt = await tx.wait()
        expect(receipt.gasUsed).eq('51749')
      })

      it('uniswapV3 price provider', async function () {
        const amountIn = parseUnits('1', 8)
        const tx = await priceProviderMock.checkGasOfQuote(
          uniswapV3Provider.address,
          WBTC_ADDRESS,
          WETH_ADDRESS,
          amountIn
        )
        const receipt = await tx.wait()
        expect(receipt.gasUsed).eq('52543')
      })
    })

    describe('3 length path', function () {
      it('uniswapV2 price provider', async function () {
        const amountIn = parseUnits('1', 8)
        const tx = await priceProviderMock.checkGasOfQuote(
          uniswapV2Provider.address,
          WBTC_ADDRESS,
          BTT_ADDRESS,
          amountIn
        )
        const receipt = await tx.wait()
        expect(receipt.gasUsed).eq('74745')
      })

      it('uniswapV3 price provider', async function () {
        const amountIn = parseUnits('1', 8)
        const tx = await priceProviderMock.checkGasOfQuote(
          uniswapV3Provider.address,
          WBTC_ADDRESS,
          BTT_ADDRESS,
          amountIn
        )
        const receipt = await tx.wait()
        expect(receipt.gasUsed).eq('71781')
      })
    })
  })

  describe('getBestAmountOut', function () {
    describe('2 length path', function () {
      it('uniswapV2 exchange', async function () {
        const amountIn = parseUnits('1', 8)
        const tx = await uniswapV2Exchange.getBestAmountOut(WBTC_ADDRESS, WETH_ADDRESS, amountIn)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).eq('38951')
      })

      it('uniswapV3 exchange', async function () {
        const amountIn = parseUnits('1', 8)
        const tx = await uniswapV3Exchange.getBestAmountOut(WBTC_ADDRESS, WETH_ADDRESS, amountIn)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).eq('112395')
      })
    })

    describe('3 length path', function () {
      it('uniswapV2 exchange', async function () {
        const amountIn = parseUnits('1', 8)
        const tx = await uniswapV2Exchange.getBestAmountOut(WBTC_ADDRESS, BTT_ADDRESS, amountIn)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).eq('52655')
      })

      it('uniswapV3 exchange', async function () {
        const amountIn = parseUnits('1', 8)
        const tx = await uniswapV3Exchange.getBestAmountOut(WBTC_ADDRESS, BTT_ADDRESS, amountIn)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).eq('191723')
      })
    })
  })

  describe('getBestAmountIn', function () {
    describe('2 length path', function () {
      it('uniswapV2 exchange', async function () {
        const amountOut = parseUnits('1', 8)
        const tx = await uniswapV2Exchange.getBestAmountIn(WETH_ADDRESS, WBTC_ADDRESS, amountOut)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).eq('38831')
      })

      it('uniswapV3 exchange', async function () {
        const amountOut = parseUnits('1', 8)
        const tx = await uniswapV3Exchange.getBestAmountIn(WETH_ADDRESS, WBTC_ADDRESS, amountOut)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).eq('109008')
      })
    })

    describe('3 length path', function () {
      it('uniswapV2 exchange', async function () {
        const amountOut = parseUnits('1', 8)
        const tx = await uniswapV2Exchange.getBestAmountIn(BTT_ADDRESS, WBTC_ADDRESS, amountOut)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).eq('52808')
      })

      it('uniswapV3 exchange', async function () {
        const amountOut = parseUnits('1', 8)
        const tx = await uniswapV3Exchange.getBestAmountIn(BTT_ADDRESS, WBTC_ADDRESS, amountOut)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).eq('187399')
      })
    })
  })

  describe('swapExactInput', function () {
    describe('2 length path', function () {
      it('uniswapV2 exchange', async function () {
        // given
        const amountIn = parseUnits('1', 8)
        const {_path} = await uniswapV2Exchange.callStatic.getBestAmountOut(WBTC_ADDRESS, WETH_ADDRESS, amountIn)

        // when
        await wbtc.transfer(uniswapV2Exchange.address, amountIn)
        const tx1 = await uniswapV2Exchange.swapExactInput(_path, amountIn, 0, deployer.address)
        await wbtc.transfer(uniswapV2Exchange.address, amountIn)
        const tx2 = await uniswapV2Exchange.swapExactInput(_path, amountIn, 0, deployer.address)

        // then
        expect((await tx1.wait()).gasUsed).eq('127955')
        expect((await tx2.wait()).gasUsed).eq('107586')
      })

      it('uniswapV3 exchange', async function () {
        // given
        const amountIn = parseUnits('1', 8)
        const {_path} = await uniswapV3Exchange.callStatic.getBestAmountOut(WBTC_ADDRESS, WETH_ADDRESS, amountIn)

        // when
        await wbtc.transfer(uniswapV3Exchange.address, amountIn)
        const tx1 = await uniswapV3Exchange.swapExactInput(_path, amountIn, 0, deployer.address)
        await wbtc.transfer(uniswapV3Exchange.address, amountIn)
        const tx2 = await uniswapV3Exchange.swapExactInput(_path, amountIn, 0, deployer.address)

        // then
        expect((await tx1.wait()).gasUsed).eq('139628')
        expect((await tx2.wait()).gasUsed).eq('119233')
      })
    })

    describe('3 length path', function () {
      it('uniswapV2 exchange', async function () {
        // given
        const amountIn = parseUnits('1', 8)
        const {_path} = await uniswapV2Exchange.callStatic.getBestAmountOut(WBTC_ADDRESS, BTT_ADDRESS, amountIn)

        // when
        await wbtc.transfer(uniswapV2Exchange.address, amountIn)
        const tx1 = await uniswapV2Exchange.swapExactInput(_path, amountIn, 0, deployer.address)
        await wbtc.transfer(uniswapV2Exchange.address, amountIn)
        const tx2 = await uniswapV2Exchange.swapExactInput(_path, amountIn, 0, deployer.address)

        // then
        expect((await tx1.wait()).gasUsed).eq('183699')
        expect((await tx2.wait()).gasUsed).eq('163331')
      })

      it('uniswapV3 exchange', async function () {
        // given
        const amountIn = parseUnits('1', 8)
        const {_path} = await uniswapV3Exchange.callStatic.getBestAmountOut(WBTC_ADDRESS, BTT_ADDRESS, amountIn)

        // when
        await wbtc.transfer(uniswapV3Exchange.address, amountIn)
        const tx1 = await uniswapV3Exchange.swapExactInput(_path, amountIn, 0, deployer.address)
        await wbtc.transfer(uniswapV3Exchange.address, amountIn)
        const tx2 = await uniswapV3Exchange.swapExactInput(_path, amountIn, 0, deployer.address)

        // then
        expect((await tx1.wait()).gasUsed).eq('213086')
        expect((await tx2.wait()).gasUsed).eq('192677')
      })
    })
  })

  describe('swapExactOutput', function () {
    describe('2 length path', function () {
      it('uniswapV2 exchange', async function () {
        // given
        const amountOut = parseUnits('1', 8)

        // when
        const {_amountIn: _amountIn1, _path: _path1} = await uniswapV2Exchange.callStatic.getBestAmountIn(
          WETH_ADDRESS,
          WBTC_ADDRESS,
          amountOut
        )
        await weth.transfer(uniswapV2Exchange.address, _amountIn1)
        const tx1 = await uniswapV2Exchange.swapExactOutput(
          _path1,
          amountOut,
          _amountIn1,
          deployer.address,
          deployer.address
        )
        const {_amountIn: _amountIn2, _path: _path2} = await uniswapV2Exchange.callStatic.getBestAmountIn(
          WETH_ADDRESS,
          WBTC_ADDRESS,
          amountOut
        )
        await weth.transfer(uniswapV2Exchange.address, _amountIn2)
        const tx2 = await uniswapV2Exchange.swapExactOutput(
          _path2,
          amountOut,
          _amountIn2,
          deployer.address,
          deployer.address
        )

        // then
        expect((await tx1.wait()).gasUsed).eq('127246')
        expect((await tx2.wait()).gasUsed).eq('104393')
      })

      it('uniswapV3 exchange', async function () {
        // given
        const amountOut = parseUnits('1', 8)

        // when
        const {_path: _path1, _amountIn: _amountIn1} = await uniswapV3Exchange.callStatic.getBestAmountIn(
          WETH_ADDRESS,
          WBTC_ADDRESS,
          amountOut
        )
        await weth.transfer(uniswapV3Exchange.address, _amountIn1)
        const tx1 = await uniswapV3Exchange.swapExactOutput(
          _path1,
          amountOut,
          _amountIn1,
          deployer.address,
          deployer.address
        )
        const {_path: _path2, _amountIn: _amountIn2} = await uniswapV3Exchange.callStatic.getBestAmountIn(
          WETH_ADDRESS,
          WBTC_ADDRESS,
          amountOut
        )
        await weth.transfer(uniswapV3Exchange.address, _amountIn2)
        const tx2 = await uniswapV3Exchange.swapExactOutput(
          _path2,
          amountOut,
          _amountIn2,
          deployer.address,
          deployer.address
        )

        // then
        expect((await tx1.wait()).gasUsed).eq('131737')
        expect((await tx2.wait()).gasUsed).eq('117498')
      })
    })

    describe('3 length path', function () {
      it('uniswapV2 exchange', async function () {
        // given
        const amountOut = parseUnits('0.001', 8)

        // when
        const {_path: _path1, _amountIn: _amountIn1} = await uniswapV2Exchange.callStatic.getBestAmountIn(
          BTT_ADDRESS,
          WBTC_ADDRESS,
          amountOut
        )
        await btt.transfer(uniswapV2Exchange.address, _amountIn1)
        const tx1 = await uniswapV2Exchange.swapExactOutput(
          _path1,
          amountOut,
          _amountIn1,
          deployer.address,
          deployer.address
        )
        const {_path: _path2, _amountIn: _amountIn2} = await uniswapV2Exchange.callStatic.getBestAmountIn(
          BTT_ADDRESS,
          WBTC_ADDRESS,
          amountOut
        )
        await btt.transfer(uniswapV2Exchange.address, _amountIn2)
        const tx2 = await uniswapV2Exchange.swapExactOutput(
          _path2,
          amountOut,
          _amountIn2,
          deployer.address,
          deployer.address
        )

        // then
        expect((await tx1.wait()).gasUsed).eq('185846')
        expect((await tx2.wait()).gasUsed).eq('165574')
      })

      it('uniswapV3 exchange', async function () {
        // given
        const amountOut = parseUnits('0.001', 8)

        // when
        const {_path: _path1, _amountIn: _amountIn1} = await uniswapV3Exchange.callStatic.getBestAmountIn(
          BTT_ADDRESS,
          WBTC_ADDRESS,
          amountOut
        )
        await btt.transfer(uniswapV3Exchange.address, _amountIn1)
        const tx1 = await uniswapV3Exchange.swapExactOutput(
          _path1,
          amountOut,
          _amountIn1,
          deployer.address,
          deployer.address
        )
        const {_path: _path2, _amountIn: _amountIn2} = await uniswapV3Exchange.callStatic.getBestAmountIn(
          BTT_ADDRESS,
          WBTC_ADDRESS,
          amountOut
        )
        await btt.transfer(uniswapV3Exchange.address, _amountIn2)
        const tx2 = await uniswapV3Exchange.swapExactOutput(
          _path2,
          amountOut,
          _amountIn2,
          deployer.address,
          deployer.address
        )

        // then
        expect((await tx1.wait()).gasUsed).eq('194871')
        expect((await tx2.wait()).gasUsed).eq('174562')
      })
    })
  })

  describe('Swapper', function () {
    describe('awful case: 3 exchanges + token not listed on chainlink + 3 length path', function () {
      it('getBestAmountOut', async function () {
        const amountIn = parseUnits('1', 8)
        const tx = await swapper.getBestAmountOut(WBTC_ADDRESS, BTT_ADDRESS, amountIn)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).eq('370871')
      })

      it('swapExactInput', async function () {
        // given
        const amountIn = parseUnits('0.001', 8)

        // when
        await wbtc.approve(swapper.address, amountIn)
        const tx1 = await swapper.swapExactInput(WBTC_ADDRESS, BTT_ADDRESS, amountIn, deployer.address)
        await wbtc.approve(swapper.address, amountIn)
        const tx2 = await swapper.swapExactInput(WBTC_ADDRESS, BTT_ADDRESS, amountIn, deployer.address)

        // then
        expect((await tx1.wait()).gasUsed).eq('514387')
        expect((await tx2.wait()).gasUsed).eq('493982')
      })

      it('getBestAmountIn', async function () {
        const amountOut = parseUnits('1', 8)
        const tx = await swapper.getBestAmountIn(BTT_ADDRESS, WBTC_ADDRESS, amountOut)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).eq('367049')
      })

      it('swapExactOutput', async function () {
        // given
        const amountOut = parseUnits('0.001', 8)
        const {_amountInMax} = await swapper.callStatic.getBestAmountIn(BTT_ADDRESS, WBTC_ADDRESS, amountOut)

        // when
        await btt.approve(swapper.address, _amountInMax)
        const tx1 = await swapper.swapExactOutput(BTT_ADDRESS, WBTC_ADDRESS, amountOut, deployer.address)

        await btt.approve(swapper.address, _amountInMax)
        const tx2 = await swapper.swapExactOutput(BTT_ADDRESS, WBTC_ADDRESS, amountOut, deployer.address)

        // then
        expect((await tx1.wait()).gasUsed).eq('532089')
        expect((await tx2.wait()).gasUsed).eq('511817')
      })

      describe('with preferable path', function () {
        beforeEach(async function () {
          const preferablePath = ethers.utils.solidityPack(
            ['address', 'uint24', 'address', 'uint24', 'address'],
            [WBTC_ADDRESS, uniswapV3DefaultPoolFee, WETH_ADDRESS, uniswapV3DefaultPoolFee, BTT_ADDRESS]
          )
          await swapper.setPreferablePath(
            SwapType.EXACT_INPUT,
            WBTC_ADDRESS,
            BTT_ADDRESS,
            ExchangeType.UNISWAP_V3,
            preferablePath
          )

          await swapper.setPreferablePath(
            SwapType.EXACT_OUTPUT,
            BTT_ADDRESS,
            WBTC_ADDRESS,
            ExchangeType.UNISWAP_V3,
            preferablePath
          )
        })

        it('getBestAmountOut', async function () {
          const amountIn = parseUnits('1', 8)
          const tx = await swapper.getBestAmountOut(WBTC_ADDRESS, BTT_ADDRESS, amountIn)
          const receipt = await tx.wait()
          expect(receipt.gasUsed).eq('153230')
        })

        it('swapExactInput', async function () {
          // given
          const amountIn = parseUnits('0.001', 8)

          // when
          await wbtc.approve(swapper.address, amountIn)
          const tx1 = await swapper.swapExactInput(WBTC_ADDRESS, BTT_ADDRESS, amountIn, deployer.address)
          await wbtc.approve(swapper.address, amountIn)
          const tx2 = await swapper.swapExactInput(WBTC_ADDRESS, BTT_ADDRESS, amountIn, deployer.address)

          // then
          expect((await tx1.wait()).gasUsed).eq('331599')
          expect((await tx2.wait()).gasUsed).eq('311194')
        })

        it('getBestAmountIn', async function () {
          const amountOut = parseUnits('1', 8)
          const tx = await swapper.getBestAmountIn(BTT_ADDRESS, WBTC_ADDRESS, amountOut)
          const receipt = await tx.wait()
          expect(receipt.gasUsed).eq('153199')
        })

        it('swapExactOutput', async function () {
          // given
          const amountOut = parseUnits('0.001', 8)
          const {_amountInMax} = await swapper.callStatic.getBestAmountIn(BTT_ADDRESS, WBTC_ADDRESS, amountOut)

          // when
          await btt.approve(swapper.address, _amountInMax)
          const tx1 = await swapper.swapExactOutput(BTT_ADDRESS, WBTC_ADDRESS, amountOut, deployer.address)
          await btt.approve(swapper.address, _amountInMax)
          const tx2 = await swapper.swapExactOutput(BTT_ADDRESS, WBTC_ADDRESS, amountOut, deployer.address)

          // then
          expect((await tx1.wait()).gasUsed).eq('334596')
          expect((await tx2.wait()).gasUsed).eq('314287')
        })
      })
    })

    describe('worst case: 3 exchanges + chainlink tokens + 3 length path', function () {
      it('getBestAmountOut', async function () {
        const amountIn = parseUnits('1', 8)
        const tx = await swapper.getBestAmountOut(WBTC_ADDRESS, DAI_ADDRESS, amountIn)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).eq('354999')
      })

      it('swapExactInput', async function () {
        // given
        const amountIn = parseUnits('1', 8)

        // when
        await wbtc.approve(swapper.address, amountIn)
        const tx1 = await swapper.swapExactInput(WBTC_ADDRESS, DAI_ADDRESS, amountIn, deployer.address)
        await wbtc.approve(swapper.address, amountIn)
        const tx2 = await swapper.swapExactInput(WBTC_ADDRESS, DAI_ADDRESS, amountIn, deployer.address)

        // then
        expect((await tx1.wait()).gasUsed).eq('517182')
        expect((await tx2.wait()).gasUsed).eq('498773')
      })

      it('getBestAmountIn', async function () {
        const amountOut = parseUnits('1', 8)
        const tx = await swapper.getBestAmountIn(DAI_ADDRESS, WBTC_ADDRESS, amountOut)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).eq('351165')
      })

      it('swapExactOutput', async function () {
        // given
        const amountOut = parseUnits('1', 8)
        const {_amountInMax} = await swapper.callStatic.getBestAmountIn(DAI_ADDRESS, WBTC_ADDRESS, amountOut)

        // when
        await dai.approve(swapper.address, _amountInMax)
        const tx1 = await swapper.swapExactOutput(DAI_ADDRESS, WBTC_ADDRESS, amountOut, deployer.address)
        await dai.approve(swapper.address, _amountInMax)
        const tx2 = await swapper.swapExactOutput(DAI_ADDRESS, WBTC_ADDRESS, amountOut, deployer.address)

        // then
        expect((await tx1.wait()).gasUsed).eq('509141')
        expect((await tx2.wait()).gasUsed).eq('499357')
      })

      describe('with preferable path', function () {
        beforeEach(async function () {
          const preferablePath = ethers.utils.solidityPack(
            ['address', 'uint24', 'address', 'uint24', 'address'],
            [WBTC_ADDRESS, uniswapV3DefaultPoolFee, WETH_ADDRESS, uniswapV3DefaultPoolFee, DAI_ADDRESS]
          )
          await swapper.setPreferablePath(
            SwapType.EXACT_INPUT,
            WBTC_ADDRESS,
            DAI_ADDRESS,
            ExchangeType.UNISWAP_V3,
            preferablePath
          )

          await swapper.setPreferablePath(
            SwapType.EXACT_OUTPUT,
            DAI_ADDRESS,
            WBTC_ADDRESS,
            ExchangeType.UNISWAP_V3,
            preferablePath
          )
        })

        it('getBestAmountOut', async function () {
          const amountIn = parseUnits('1', 8)
          const tx = await swapper.getBestAmountOut(WBTC_ADDRESS, DAI_ADDRESS, amountIn)
          const receipt = await tx.wait()
          expect(receipt.gasUsed).eq('117971')
        })

        it('swapExactInput', async function () {
          // given
          const amountIn = parseUnits('1', 8)

          // when
          await wbtc.approve(swapper.address, amountIn)
          const tx1 = await swapper.swapExactInput(WBTC_ADDRESS, DAI_ADDRESS, amountIn, deployer.address)
          await wbtc.approve(swapper.address, amountIn)
          const tx2 = await swapper.swapExactInput(WBTC_ADDRESS, DAI_ADDRESS, amountIn, deployer.address)

          // then
          expect((await tx1.wait()).gasUsed).eq('322153')
          expect((await tx2.wait()).gasUsed).eq('302746')
        })

        it('getBestAmountIn', async function () {
          const amountOut = parseUnits('1', 8)
          const tx = await swapper.getBestAmountIn(DAI_ADDRESS, WBTC_ADDRESS, amountOut)
          const receipt = await tx.wait()
          expect(receipt.gasUsed).eq('117940')
        })

        it('swapExactOutput', async function () {
          // given
          const amountOut = parseUnits('1', 8)
          const {_amountInMax} = await swapper.callStatic.getBestAmountIn(DAI_ADDRESS, WBTC_ADDRESS, amountOut)

          // when
          await dai.approve(swapper.address, _amountInMax)
          const tx1 = await swapper.swapExactOutput(DAI_ADDRESS, WBTC_ADDRESS, amountOut, deployer.address)
          await dai.approve(swapper.address, _amountInMax)
          const tx2 = await swapper.swapExactOutput(DAI_ADDRESS, WBTC_ADDRESS, amountOut, deployer.address)

          // then
          expect((await tx1.wait()).gasUsed).eq('313914')
          expect((await tx2.wait()).gasUsed).eq('299525')
        })
      })
    })

    describe('avg case: 2 exchanges + chainlink tokens + 3 length path', function () {
      beforeEach(async function () {
        await swapper.setExchange(ExchangeType.SUSHISWAP, ethers.constants.AddressZero)
      })

      it('getBestAmountOut', async function () {
        const amountIn = parseUnits('1', 8)
        const tx = await swapper.getBestAmountOut(WBTC_ADDRESS, DAI_ADDRESS, amountIn)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).eq('317265')
      })

      it('swapExactInput', async function () {
        // given
        const amountIn = parseUnits('1', 8)

        // when
        await wbtc.approve(swapper.address, amountIn)
        const tx1 = await swapper.swapExactInput(WBTC_ADDRESS, DAI_ADDRESS, amountIn, deployer.address)
        await wbtc.approve(swapper.address, amountIn)
        const tx2 = await swapper.swapExactInput(WBTC_ADDRESS, DAI_ADDRESS, amountIn, deployer.address)

        // then
        expect((await tx1.wait()).gasUsed).eq('479447')
        expect((await tx2.wait()).gasUsed).eq('461038')
      })

      it('getBestAmountIn', async function () {
        const amountOut = parseUnits('1', 8)
        const tx = await swapper.getBestAmountIn(DAI_ADDRESS, WBTC_ADDRESS, amountOut)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).eq('313173')
      })

      it('swapExactOutput', async function () {
        // given
        const amountOut = parseUnits('1', 8)
        const {_amountInMax} = await swapper.callStatic.getBestAmountIn(DAI_ADDRESS, WBTC_ADDRESS, amountOut)

        // when
        await dai.approve(swapper.address, _amountInMax)
        const tx1 = await swapper.swapExactOutput(DAI_ADDRESS, WBTC_ADDRESS, amountOut, deployer.address)
        await dai.approve(swapper.address, _amountInMax)
        const tx2 = await swapper.swapExactOutput(DAI_ADDRESS, WBTC_ADDRESS, amountOut, deployer.address)

        // then
        expect((await tx1.wait()).gasUsed).eq('471147')
        expect((await tx2.wait()).gasUsed).eq('461363')
      })

      describe('with preferable path', function () {
        beforeEach(async function () {
          const preferablePath = ethers.utils.solidityPack(
            ['address', 'uint24', 'address', 'uint24', 'address'],
            [WBTC_ADDRESS, uniswapV3DefaultPoolFee, WETH_ADDRESS, uniswapV3DefaultPoolFee, DAI_ADDRESS]
          )
          await swapper.setPreferablePath(
            SwapType.EXACT_INPUT,
            WBTC_ADDRESS,
            DAI_ADDRESS,
            ExchangeType.UNISWAP_V3,
            preferablePath
          )

          await swapper.setPreferablePath(
            SwapType.EXACT_OUTPUT,
            DAI_ADDRESS,
            WBTC_ADDRESS,
            ExchangeType.UNISWAP_V3,
            preferablePath
          )
        })

        it('getBestAmountOut', async function () {
          const amountIn = parseUnits('1', 8)
          const tx = await swapper.getBestAmountOut(WBTC_ADDRESS, DAI_ADDRESS, amountIn)
          const receipt = await tx.wait()
          expect(receipt.gasUsed).eq('117971')
        })

        it('swapExactInput', async function () {
          // given
          const amountIn = parseUnits('1', 8)

          // when
          await wbtc.approve(swapper.address, amountIn)
          const tx1 = await swapper.swapExactInput(WBTC_ADDRESS, DAI_ADDRESS, amountIn, deployer.address)
          await wbtc.approve(swapper.address, amountIn)
          const tx2 = await swapper.swapExactInput(WBTC_ADDRESS, DAI_ADDRESS, amountIn, deployer.address)

          // then
          expect((await tx1.wait()).gasUsed).eq('322153')
          expect((await tx2.wait()).gasUsed).eq('302746')
        })

        it('getBestAmountIn', async function () {
          const amountOut = parseUnits('1', 8)
          const tx = await swapper.getBestAmountIn(DAI_ADDRESS, WBTC_ADDRESS, amountOut)
          const receipt = await tx.wait()
          expect(receipt.gasUsed).eq('117940')
        })

        it('swapExactOutput', async function () {
          // given
          const amountOut = parseUnits('1', 8)
          const {_amountInMax} = await swapper.callStatic.getBestAmountIn(DAI_ADDRESS, WBTC_ADDRESS, amountOut)

          // when
          await dai.approve(swapper.address, _amountInMax)
          const tx1 = await swapper.swapExactOutput(DAI_ADDRESS, WBTC_ADDRESS, amountOut, deployer.address)
          await dai.approve(swapper.address, _amountInMax)
          const tx2 = await swapper.swapExactOutput(DAI_ADDRESS, WBTC_ADDRESS, amountOut, deployer.address)

          // then
          expect((await tx1.wait()).gasUsed).eq('313914')
          expect((await tx2.wait()).gasUsed).eq('299525')
        })
      })
    })

    describe('best case: 2 exchanges + chainlink tokens + 2 length path', function () {
      const abi = ethers.utils.defaultAbiCoder

      beforeEach(async function () {
        await swapper.setExchange(ExchangeType.SUSHISWAP, ethers.constants.AddressZero)
      })

      it('getBestAmountOut', async function () {
        const amountIn = parseUnits('1', 8)
        const tx = await swapper.getBestAmountOut(WBTC_ADDRESS, WETH_ADDRESS, amountIn)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).eq('221395')
      })

      it('swapExactInput', async function () {
        // given
        const amountIn = parseUnits('1', 8)

        // when
        await wbtc.approve(swapper.address, amountIn)
        const tx1 = await swapper.swapExactInput(WBTC_ADDRESS, WETH_ADDRESS, amountIn, deployer.address)
        await wbtc.approve(swapper.address, amountIn)
        const tx2 = await swapper.swapExactInput(WBTC_ADDRESS, WETH_ADDRESS, amountIn, deployer.address)

        // then
        expect((await tx1.wait()).gasUsed).eq('331231')
        expect((await tx2.wait()).gasUsed).eq('310846')
      })

      it('getBestAmountIn', async function () {
        const amountOut = parseUnits('1', 8)
        const tx = await swapper.getBestAmountIn(WETH_ADDRESS, WBTC_ADDRESS, amountOut)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).eq('215919')
      })

      it('swapExactOutput', async function () {
        // given
        const amountOut = parseUnits('1', 8)
        const {_amountInMax} = await swapper.callStatic.getBestAmountIn(WETH_ADDRESS, WBTC_ADDRESS, amountOut)

        // when
        await weth.approve(swapper.address, _amountInMax)
        const tx1 = await swapper.swapExactOutput(WETH_ADDRESS, WBTC_ADDRESS, amountOut, deployer.address)
        await weth.approve(swapper.address, _amountInMax)
        const tx2 = await swapper.swapExactOutput(WETH_ADDRESS, WBTC_ADDRESS, amountOut, deployer.address)

        // then
        expect((await tx1.wait()).gasUsed).eq('325589')
        expect((await tx2.wait()).gasUsed).eq('316011')
      })

      describe('with preferable path', function () {
        beforeEach(async function () {
          await swapper.setPreferablePath(
            SwapType.EXACT_INPUT,
            WBTC_ADDRESS,
            WETH_ADDRESS,
            ExchangeType.UNISWAP_V2,
            abi.encode(['address[]'], [[WBTC_ADDRESS, WETH_ADDRESS]])
          )
          await swapper.setPreferablePath(
            SwapType.EXACT_OUTPUT,
            WETH_ADDRESS,
            WBTC_ADDRESS,
            ExchangeType.UNISWAP_V2,
            abi.encode(['address[]'], [[WETH_ADDRESS, WBTC_ADDRESS]])
          )
        })

        it('getBestAmountOut', async function () {
          const amountIn = parseUnits('1', 8)
          const tx = await swapper.getBestAmountOut(WBTC_ADDRESS, WETH_ADDRESS, amountIn)
          const receipt = await tx.wait()
          expect(receipt.gasUsed).eq('122454')
        })

        it('swapExactInput', async function () {
          // given
          const amountIn = parseUnits('1', 8)

          // when
          await wbtc.approve(swapper.address, amountIn)
          const tx1 = await swapper.swapExactInput(WBTC_ADDRESS, WETH_ADDRESS, amountIn, deployer.address)
          await wbtc.approve(swapper.address, amountIn)
          const tx2 = await swapper.swapExactInput(WBTC_ADDRESS, WETH_ADDRESS, amountIn, deployer.address)

          // then
          expect((await tx1.wait()).gasUsed).eq('242000')
          expect((await tx2.wait()).gasUsed).eq('221631')
        })

        it('getBestAmountIn', async function () {
          const amountOut = parseUnits('1', 8)
          const tx = await swapper.getBestAmountIn(WETH_ADDRESS, WBTC_ADDRESS, amountOut)
          const receipt = await tx.wait()
          expect(receipt.gasUsed).eq('122423')
        })

        it('swapExactOutput', async function () {
          // given
          const amountOut = parseUnits('1', 8)
          const {_amountInMax} = await swapper.callStatic.getBestAmountIn(WETH_ADDRESS, WBTC_ADDRESS, amountOut)
          await weth.approve(swapper.address, _amountInMax)
          const tx1 = await swapper.swapExactOutput(WETH_ADDRESS, WBTC_ADDRESS, amountOut, deployer.address)

          // when
          await weth.approve(swapper.address, _amountInMax)
          const tx2 = await swapper.swapExactOutput(WETH_ADDRESS, WBTC_ADDRESS, amountOut, deployer.address)

          // then
          expect((await tx1.wait()).gasUsed).eq('245157')
          expect((await tx2.wait()).gasUsed).eq('222293')
        })
      })
    })
  })
})
