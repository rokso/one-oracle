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
      ethers.constants.AddressZero // stableCoinProvider
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
      ethers.constants.AddressZero // stableCoinProvider
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
      expect(receipt.gasUsed).closeTo('82000', 500)
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
        expect(receipt.gasUsed).closeTo('51500', 500)
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
        expect(receipt.gasUsed).closeTo('52500', 500)
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
        expect(receipt.gasUsed).closeTo('74500', 500)
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
        expect(receipt.gasUsed).closeTo('71500', 500)
      })
    })
  })

  describe('getBestAmountOut', function () {
    describe('2 length path', function () {
      it('uniswapV2 exchange', async function () {
        const amountIn = parseUnits('1', 8)
        const tx = await uniswapV2Exchange.getBestAmountOut(WBTC_ADDRESS, WETH_ADDRESS, amountIn)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).closeTo('39000', 500)
      })

      it('uniswapV3 exchange', async function () {
        const amountIn = parseUnits('1', 8)
        const tx = await uniswapV3Exchange.getBestAmountOut(WBTC_ADDRESS, WETH_ADDRESS, amountIn)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).closeTo('112500', 500)
      })
    })

    describe('3 length path', function () {
      it('uniswapV2 exchange', async function () {
        const amountIn = parseUnits('1', 8)
        const tx = await uniswapV2Exchange.getBestAmountOut(WBTC_ADDRESS, BTT_ADDRESS, amountIn)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).closeTo('52500', 500)
      })

      it('uniswapV3 exchange', async function () {
        const amountIn = parseUnits('1', 8)
        const tx = await uniswapV3Exchange.getBestAmountOut(WBTC_ADDRESS, BTT_ADDRESS, amountIn)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).closeTo('191500', 500)
      })
    })
  })

  describe('getBestAmountIn', function () {
    describe('2 length path', function () {
      it('uniswapV2 exchange', async function () {
        const amountOut = parseUnits('1', 8)
        const tx = await uniswapV2Exchange.getBestAmountIn(WETH_ADDRESS, WBTC_ADDRESS, amountOut)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).closeTo('39000', 500)
      })

      it('uniswapV3 exchange', async function () {
        const amountOut = parseUnits('1', 8)
        const tx = await uniswapV3Exchange.getBestAmountIn(WETH_ADDRESS, WBTC_ADDRESS, amountOut)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).closeTo('109000', 500)
      })
    })

    describe('3 length path', function () {
      it('uniswapV2 exchange', async function () {
        const amountOut = parseUnits('1', 8)
        const tx = await uniswapV2Exchange.getBestAmountIn(BTT_ADDRESS, WBTC_ADDRESS, amountOut)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).closeTo('52500', 500)
      })

      it('uniswapV3 exchange', async function () {
        const amountOut = parseUnits('1', 8)
        const tx = await uniswapV3Exchange.getBestAmountIn(BTT_ADDRESS, WBTC_ADDRESS, amountOut)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).closeTo('187500', 500)
      })
    })
  })

  describe('swapExactInput', function () {
    describe('2 length path', function () {
      it('uniswapV2 exchange', async function () {
        const amountIn = parseUnits('1', 8)
        const {_path} = await uniswapV2Exchange.callStatic.getBestAmountOut(WBTC_ADDRESS, WETH_ADDRESS, amountIn)
        await wbtc.transfer(uniswapV2Exchange.address, amountIn)
        const tx = await uniswapV2Exchange.swapExactInput(_path, amountIn, 0, deployer.address)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).closeTo('109250', 500)
      })

      it('uniswapV3 exchange', async function () {
        const amountIn = parseUnits('1', 8)
        const {_path} = await uniswapV3Exchange.callStatic.getBestAmountOut(WBTC_ADDRESS, WETH_ADDRESS, amountIn)
        await wbtc.transfer(uniswapV3Exchange.address, amountIn)
        const tx = await uniswapV3Exchange.swapExactInput(_path, amountIn, 0, deployer.address)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).closeTo('120500', 500)
      })
    })

    describe('3 length path', function () {
      it('uniswapV2 exchange', async function () {
        const amountIn = parseUnits('1', 8)
        const {_path} = await uniswapV2Exchange.callStatic.getBestAmountOut(WBTC_ADDRESS, BTT_ADDRESS, amountIn)
        await wbtc.transfer(uniswapV2Exchange.address, amountIn)
        const tx = await uniswapV2Exchange.swapExactInput(_path, amountIn, 0, deployer.address)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).closeTo('164800', 500)
      })

      it('uniswapV3 exchange', async function () {
        const amountIn = parseUnits('1', 8)
        const {_path} = await uniswapV3Exchange.callStatic.getBestAmountOut(WBTC_ADDRESS, BTT_ADDRESS, amountIn)
        await wbtc.transfer(uniswapV3Exchange.address, amountIn)
        const tx = await uniswapV3Exchange.swapExactInput(_path, amountIn, 0, deployer.address)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).closeTo('194000', 500)
      })
    })
  })

  describe('swapExactOutput', function () {
    describe('2 length path', function () {
      it('uniswapV2 exchange', async function () {
        const amountOut = parseUnits('1', 8)
        const {_amountIn, _path} = await uniswapV2Exchange.callStatic.getBestAmountIn(
          WETH_ADDRESS,
          WBTC_ADDRESS,
          amountOut
        )
        await weth.transfer(uniswapV2Exchange.address, _amountIn)
        const tx = await uniswapV2Exchange.swapExactOutput(
          _path,
          amountOut,
          _amountIn,
          deployer.address,
          deployer.address
        )
        const receipt = await tx.wait()
        expect(receipt.gasUsed).closeTo('109250', 500)
      })

      it('uniswapV3 exchange', async function () {
        const amountOut = parseUnits('1', 8)
        const {_path, _amountIn} = await uniswapV3Exchange.callStatic.getBestAmountIn(
          WETH_ADDRESS,
          WBTC_ADDRESS,
          amountOut
        )
        await weth.transfer(uniswapV3Exchange.address, _amountIn)
        const tx = await uniswapV3Exchange.swapExactOutput(
          _path,
          amountOut,
          _amountIn,
          deployer.address,
          deployer.address
        )
        const receipt = await tx.wait()
        expect(receipt.gasUsed).closeTo('118500', 500)
      })
    })

    describe('3 length path', function () {
      it('uniswapV2 exchange', async function () {
        const amountOut = parseUnits('1', 8)
        const {_path, _amountIn} = await uniswapV2Exchange.callStatic.getBestAmountIn(
          BTT_ADDRESS,
          WBTC_ADDRESS,
          amountOut
        )
        await btt.transfer(uniswapV2Exchange.address, _amountIn)
        const tx = await uniswapV2Exchange.swapExactOutput(
          _path,
          amountOut,
          _amountIn,
          deployer.address,
          deployer.address
        )
        const receipt = await tx.wait()
        expect(receipt.gasUsed).closeTo('167000', 500)
      })

      it('uniswapV3 exchange', async function () {
        const amountOut = parseUnits('1', 8)
        const {_path, _amountIn} = await uniswapV3Exchange.callStatic.getBestAmountIn(
          BTT_ADDRESS,
          WBTC_ADDRESS,
          amountOut
        )
        await btt.transfer(uniswapV3Exchange.address, _amountIn)
        const tx = await uniswapV3Exchange.swapExactOutput(
          _path,
          amountOut,
          _amountIn,
          deployer.address,
          deployer.address
        )
        const receipt = await tx.wait()
        expect(receipt.gasUsed).closeTo('186500', 500)
      })
    })
  })

  describe('Swapper', function () {
    describe('worst case: 3 exchanges + token not listed on chainlink + 3 length path', function () {
      it('getBestAmountOut', async function () {
        const amountIn = parseUnits('1', 8)
        const tx = await swapper.getBestAmountOut(WBTC_ADDRESS, BTT_ADDRESS, amountIn)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).closeTo('370750', 500)
      })

      it('swapExactInput', async function () {
        const amountIn = parseUnits('1', 8)
        await wbtc.approve(swapper.address, amountIn)
        const tx = await swapper.swapExactInput(WBTC_ADDRESS, BTT_ADDRESS, amountIn, deployer.address)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).closeTo('515850', 500)
      })

      it('getBestAmountIn', async function () {
        const amountOut = parseUnits('1', 8)
        const tx = await swapper.getBestAmountIn(BTT_ADDRESS, WBTC_ADDRESS, amountOut)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).closeTo('367000', 500)
      })

      it('swapExactOutput', async function () {
        const amountOut = parseUnits('1', 8)
        const {_amountInMax} = await swapper.callStatic.getBestAmountIn(BTT_ADDRESS, WBTC_ADDRESS, amountOut)
        await btt.approve(swapper.address, _amountInMax)
        const tx = await swapper.swapExactOutput(BTT_ADDRESS, WBTC_ADDRESS, amountOut, deployer.address)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).closeTo('534500', 500)
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
          expect(receipt.gasUsed).closeTo('153200', 500)
        })

        it('swapExactInput', async function () {
          // when
          const amountIn = parseUnits('1', 8)
          await wbtc.approve(swapper.address, amountIn)
          const tx = await swapper.swapExactInput(WBTC_ADDRESS, BTT_ADDRESS, amountIn, deployer.address)

          // then
          const receipt = await tx.wait()
          expect(receipt.gasUsed).closeTo('323800', 500)
        })

        it('getBestAmountIn', async function () {
          const amountOut = parseUnits('1', 8)
          const tx = await swapper.getBestAmountIn(BTT_ADDRESS, WBTC_ADDRESS, amountOut)
          const receipt = await tx.wait()
          expect(receipt.gasUsed).closeTo('153200', 500)
        })

        it('swapExactOutput', async function () {
          // when
          const amountOut = parseUnits('1', 8)
          const {_amountInMax} = await swapper.callStatic.getBestAmountIn(BTT_ADDRESS, WBTC_ADDRESS, amountOut)
          await btt.approve(swapper.address, _amountInMax)
          const tx = await swapper.swapExactOutput(BTT_ADDRESS, WBTC_ADDRESS, amountOut, deployer.address)

          // then
          const receipt = await tx.wait()
          expect(receipt.gasUsed).closeTo('344300', 500)
        })
      })
    })

    describe('avg case: 3 exchanges + chainlink tokens + 3 length path', function () {
      it('getBestAmountOut', async function () {
        const amountIn = parseUnits('1', 8)
        const tx = await swapper.getBestAmountOut(WBTC_ADDRESS, DAI_ADDRESS, amountIn)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).closeTo('354850', 500)
      })

      it('swapExactInput', async function () {
        const amountIn = parseUnits('1', 8)
        await wbtc.approve(swapper.address, amountIn)
        const tx = await swapper.swapExactInput(WBTC_ADDRESS, DAI_ADDRESS, amountIn, deployer.address)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).closeTo('497950', 500)
      })

      it('getBestAmountIn', async function () {
        const amountOut = parseUnits('1', 8)
        const tx = await swapper.getBestAmountIn(DAI_ADDRESS, WBTC_ADDRESS, amountOut)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).closeTo('351000', 500)
      })

      it('swapExactOutput', async function () {
        const amountOut = parseUnits('1', 8)
        const {_amountInMax} = await swapper.callStatic.getBestAmountIn(DAI_ADDRESS, WBTC_ADDRESS, amountOut)
        await dai.approve(swapper.address, _amountInMax)
        const tx = await swapper.swapExactOutput(DAI_ADDRESS, WBTC_ADDRESS, amountOut, deployer.address)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).closeTo('515900', 500)
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
          expect(receipt.gasUsed).closeTo('118000', 500)
        })

        it('swapExactInput', async function () {
          const amountIn = parseUnits('1', 8)
          await wbtc.approve(swapper.address, amountIn)
          const tx = await swapper.swapExactInput(WBTC_ADDRESS, DAI_ADDRESS, amountIn, deployer.address)
          const receipt = await tx.wait()
          expect(receipt.gasUsed).closeTo('303000', 500)
        })

        it('getBestAmountIn', async function () {
          const amountOut = parseUnits('1', 8)
          const tx = await swapper.getBestAmountIn(DAI_ADDRESS, WBTC_ADDRESS, amountOut)
          const receipt = await tx.wait()
          expect(receipt.gasUsed).closeTo('117950', 500)
        })

        it('swapExactOutput', async function () {
          const amountOut = parseUnits('1', 8)
          const {_amountInMax} = await swapper.callStatic.getBestAmountIn(DAI_ADDRESS, WBTC_ADDRESS, amountOut)
          await dai.approve(swapper.address, _amountInMax)
          const tx = await swapper.swapExactOutput(DAI_ADDRESS, WBTC_ADDRESS, amountOut, deployer.address)
          const receipt = await tx.wait()
          expect(receipt.gasUsed).closeTo('320850', 500)
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
        expect(receipt.gasUsed).closeTo('221290', 500)
      })

      it('swapExactInput', async function () {
        const amountIn = parseUnits('1', 8)
        await wbtc.approve(swapper.address, amountIn)
        const tx = await swapper.swapExactInput(WBTC_ADDRESS, WETH_ADDRESS, amountIn, deployer.address)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).closeTo('312000', 500)
      })

      it('getBestAmountIn', async function () {
        const amountOut = parseUnits('1', 8)
        const tx = await swapper.getBestAmountIn(WETH_ADDRESS, WBTC_ADDRESS, amountOut)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).closeTo('215800', 500)
      })

      it('swapExactOutput', async function () {
        const amountOut = parseUnits('1', 8)
        const {_amountInMax} = await swapper.callStatic.getBestAmountIn(WETH_ADDRESS, WBTC_ADDRESS, amountOut)
        await weth.approve(swapper.address, _amountInMax)
        const tx = await swapper.swapExactOutput(WETH_ADDRESS, WBTC_ADDRESS, amountOut, deployer.address)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).closeTo('332000', 500)
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
          expect(receipt.gasUsed).closeTo('122500', 500)
        })

        it('swapExactInput', async function () {
          const amountIn = parseUnits('1', 8)
          await wbtc.approve(swapper.address, amountIn)
          const tx = await swapper.swapExactInput(WBTC_ADDRESS, WETH_ADDRESS, amountIn, deployer.address)
          const receipt = await tx.wait()
          expect(receipt.gasUsed).closeTo('223150', 500)
        })

        it('getBestAmountIn', async function () {
          const amountOut = parseUnits('1', 8)
          const tx = await swapper.getBestAmountIn(WETH_ADDRESS, WBTC_ADDRESS, amountOut)
          const receipt = await tx.wait()
          expect(receipt.gasUsed).closeTo('122450', 500)
        })

        it('swapExactOutput', async function () {
          const amountOut = parseUnits('1', 8)
          const {_amountInMax} = await swapper.callStatic.getBestAmountIn(WETH_ADDRESS, WBTC_ADDRESS, amountOut)
          await weth.approve(swapper.address, _amountInMax)
          const tx = await swapper.swapExactOutput(WETH_ADDRESS, WBTC_ADDRESS, amountOut, deployer.address)
          const receipt = await tx.wait()
          expect(receipt.gasUsed).closeTo('247000', 500)
        })
      })
    })
  })
})
