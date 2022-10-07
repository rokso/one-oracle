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
} from '../../../typechain-types'
import {Address, ExchangeType, Provider, SwapType, InitCodeHash} from '../../../helpers'
import {HOUR, increaseTime, parseEther, parseUnits} from '../../helpers'
import {adjustBalance} from '../../helpers/balance'
import {FakeContract, smock} from '@defi-wonderland/smock'

const {
  WETH,
  DAI,
  WBTC,
  USDC,
  UNISWAP_V2_FACTORY_ADDRESS,
  SUSHISWAP_FACTORY_ADDRESS,
  Chainlink: {NOT_ON_CHAINLINK_TOKEN: BTT},
} = Address.mainnet

const UNISWAP_INIT_CODE_HASH = InitCodeHash[UNISWAP_V2_FACTORY_ADDRESS]
const SUSHISWAP_INIT_CODE_HASH = InitCodeHash[SUSHISWAP_FACTORY_ADDRESS]

const MAX_SLIPPAGE = parseEther('0.2')
const MAX_DEVIATION = parseEther('0.1') // 10%
const STALE_PERIOD = ethers.constants.MaxUint256
const DEFAULT_TWAP_PERIOD = HOUR
const DEFAULT_POOLS_FEE = 3000 // 0.3%

// Use this test when working on gas optimizations
describe.skip('GasUsage:Swapper @mainnet', function () {
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
  let addressProvider: FakeContract

  beforeEach(async function () {
    // Essentially we are making sure we execute setup once only
    // Check whether we ever created snapshot before.
    if (snapshotId) {
      // Recreate snapshot and return.
      snapshotId = await ethers.provider.send('evm_snapshot', [])
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-extra-semi
    ;[deployer] = await ethers.getSigners()

    addressProvider = await smock.fake('AddressProvider', {address: Address.ADDRESS_PROVIDER})
    addressProvider.governor.returns(deployer.address)

    weth = IERC20__factory.connect(WETH, deployer)
    dai = IERC20__factory.connect(DAI, deployer)
    wbtc = IERC20__factory.connect(WBTC, deployer)
    usdc = IERC20__factory.connect(USDC, deployer)
    btt = IERC20__factory.connect(BTT, deployer)

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

    uniswapV2Exchange = await uniswapV2LikeExchangeFactory.deploy(
      UNISWAP_V2_FACTORY_ADDRESS,
      UNISWAP_INIT_CODE_HASH,
      WETH
    )
    await uniswapV2Exchange.deployed()

    sushiswapExchange = await uniswapV2LikeExchangeFactory.deploy(
      SUSHISWAP_FACTORY_ADDRESS,
      SUSHISWAP_INIT_CODE_HASH,
      WETH
    )
    await sushiswapExchange.deployed()

    const uniswapV3ExchangeFactory = new UniswapV3Exchange__factory(deployer)
    uniswapV3Exchange = await uniswapV3ExchangeFactory.deploy(WETH)
    await uniswapV3Exchange.deployed()
    uniswapV3DefaultPoolFee = await uniswapV3Exchange.defaultPoolFee()

    const priceProviderFactory = new UniswapV2LikePriceProvider__factory(deployer)
    uniswapV2Provider = await priceProviderFactory.deploy(UNISWAP_V2_FACTORY_ADDRESS, DEFAULT_TWAP_PERIOD, WETH)
    await uniswapV2Provider.deployed()

    await uniswapV2Provider['updateOrAdd(address,address)'](DAI, WETH)
    await uniswapV2Provider['updateOrAdd(address,address)'](WBTC, WETH)
    await uniswapV2Provider['updateOrAdd(address,address)'](USDC, WETH)

    await increaseTime(DEFAULT_TWAP_PERIOD)

    await uniswapV2Provider['updateOrAdd(address,address)'](DAI, WETH)
    await uniswapV2Provider['updateOrAdd(address,address)'](WBTC, WETH)
    await uniswapV2Provider['updateOrAdd(address,address)'](USDC, WETH)

    const crossPoolOracleFactory = new UniswapV3CrossPoolOracle__factory(deployer)
    const crossPoolOracle = await crossPoolOracleFactory.deploy(weth.address)
    await crossPoolOracle.deployed()

    const uniswapV3ProviderFactory = new UniswapV3PriceProvider__factory(deployer)
    uniswapV3Provider = await uniswapV3ProviderFactory.deploy(
      crossPoolOracle.address,
      DEFAULT_TWAP_PERIOD,
      DEFAULT_POOLS_FEE
    )
    await uniswapV3Provider.deployed()

    const chainlinkProviderFactory = new ChainlinkMainnetPriceProvider__factory(deployer)
    chainlinkProvider = await chainlinkProviderFactory.deploy()
    await chainlinkProvider.deployed()

    const aggregatorProviderFactory = new PriceProvidersAggregator__factory(deployer)
    aggregator = await aggregatorProviderFactory.deploy(WETH)
    await aggregator.deployed()

    await aggregator.setPriceProvider(Provider.UNISWAP_V3, uniswapV3Provider.address)
    await aggregator.setPriceProvider(Provider.CHAINLINK, chainlinkProvider.address)

    const chainlinkAndFallbacksOracleFactory = new ChainlinkAndFallbacksOracle__factory(deployer)
    chainlinkAndFallbacksOracle = await chainlinkAndFallbacksOracleFactory.deploy(
      MAX_DEVIATION,
      STALE_PERIOD,
      Provider.UNISWAP_V3,
      Provider.UNISWAP_V2
    )

    const stableCoinProviderFactory = new StableCoinProvider__factory(deployer)
    stableCoinProvider = await stableCoinProviderFactory.deploy(USDC, DAI, STALE_PERIOD, MAX_DEVIATION)
    await stableCoinProvider.deployed()

    addressProvider.stableCoinProvider.returns(stableCoinProvider.address)
    addressProvider.providersAggregator.returns(aggregator.address)

    //
    // Swapper Setup
    //
    const swapperFactory = new Swapper__factory(deployer)
    swapper = await swapperFactory.deploy(chainlinkAndFallbacksOracle.address, MAX_SLIPPAGE)
    await swapper.deployed()

    await swapper.setExchange(ExchangeType.UNISWAP_V2, uniswapV2Exchange.address)
    await swapper.setExchange(ExchangeType.SUSHISWAP, sushiswapExchange.address)
    await swapper.setExchange(ExchangeType.UNISWAP_V3, uniswapV3Exchange.address)
    // Take snapshot of setup
    snapshotId = await ethers.provider.send('evm_snapshot', [])
  })

  afterEach(async function () {
    // Revert to snapshot point
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('oracle.quote()', function () {
    let priceProviderMock: PriceProviderMock

    beforeEach(async function () {
      const priceProviderMockFactory = new PriceProviderMock__factory(deployer)
      priceProviderMock = await priceProviderMockFactory.deploy()
    })

    it('chainlink price provider', async function () {
      const amountIn = parseUnits('0.001', 8)
      const tx = await priceProviderMock.checkGasOfQuote(chainlinkProvider.address, WBTC, WETH, amountIn)
      const receipt = await tx.wait()
      expect(receipt.gasUsed).lte('82064')
    })

    describe('2 length path', function () {
      it('uniswapV2 price provider', async function () {
        const amountIn = parseUnits('0.001', 8)
        const tx = await priceProviderMock.checkGasOfQuote(uniswapV2Provider.address, WBTC, WETH, amountIn)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).lte('51771')
      })

      it('uniswapV3 price provider', async function () {
        const amountIn = parseUnits('0.001', 8)
        const tx = await priceProviderMock.checkGasOfQuote(uniswapV3Provider.address, WBTC, WETH, amountIn)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).lte('52543')
      })
    })

    describe('3 length path', function () {
      it('uniswapV2 price provider', async function () {
        const amountIn = parseUnits('0.001', 8)
        const tx = await priceProviderMock.checkGasOfQuote(uniswapV2Provider.address, WBTC, BTT, amountIn)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).lte('74767')
      })

      it('uniswapV3 price provider', async function () {
        const amountIn = parseUnits('0.001', 8)
        const tx = await priceProviderMock.checkGasOfQuote(uniswapV3Provider.address, WBTC, BTT, amountIn)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).lte('71781')
      })
    })
  })

  describe('getBestAmountOut', function () {
    describe('2 length path', function () {
      it('uniswapV2 exchange', async function () {
        const amountIn = parseUnits('0.001', 8)
        const tx = await uniswapV2Exchange.getBestAmountOut(WBTC, WETH, amountIn)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).lte('37218')
      })

      it('uniswapV3 exchange', async function () {
        const amountIn = parseUnits('0.001', 8)
        const tx = await uniswapV3Exchange.getBestAmountOut(WBTC, WETH, amountIn)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).lte('103708')
      })
    })

    describe('3 length path', function () {
      it('uniswapV2 exchange', async function () {
        const amountIn = parseUnits('0.001', 8)
        const tx = await uniswapV2Exchange.getBestAmountOut(WBTC, BTT, amountIn)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).lte('52755')
      })

      it('uniswapV3 exchange', async function () {
        const amountIn = parseUnits('0.001', 8)
        const tx = await uniswapV3Exchange.getBestAmountOut(WBTC, BTT, amountIn)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).lte('178869')
      })
    })
  })

  describe('getBestAmountIn', function () {
    describe('2 length path', function () {
      it('uniswapV2 exchange', async function () {
        const amountOut = parseUnits('0.001', 8)
        const tx = await uniswapV2Exchange.getBestAmountIn(WETH, WBTC, amountOut)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).lte('37210')
      })

      it('uniswapV3 exchange', async function () {
        const amountOut = parseUnits('0.001', 8)
        const tx = await uniswapV3Exchange.getBestAmountIn(WETH, WBTC, amountOut)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).lte('108968')
      })
    })

    describe('3 length path', function () {
      it('uniswapV2 exchange', async function () {
        const amountOut = parseUnits('0.001', 8)
        const tx = await uniswapV2Exchange.getBestAmountIn(BTT, WBTC, amountOut)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).lte('53079')
      })

      it('uniswapV3 exchange', async function () {
        const amountOut = parseUnits('0.001', 8)
        const tx = await uniswapV3Exchange.getBestAmountIn(BTT, WBTC, amountOut)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).lte('184200')
      })
    })
  })

  describe('swapExactInput', function () {
    describe('2 length path', function () {
      it('uniswapV2 exchange', async function () {
        // given
        const amountIn = parseUnits('0.001', 8)
        const {_path} = await uniswapV2Exchange.callStatic.getBestAmountOut(WBTC, WETH, amountIn)

        // when
        await wbtc.transfer(uniswapV2Exchange.address, amountIn)
        const tx1 = await uniswapV2Exchange.swapExactInput(_path, amountIn, 0, deployer.address)
        await wbtc.transfer(uniswapV2Exchange.address, amountIn)
        const tx2 = await uniswapV2Exchange.swapExactInput(_path, amountIn, 0, deployer.address)

        // then
        expect((await tx1.wait()).gasUsed).lte('98856')
        expect((await tx2.wait()).gasUsed).lte('98856')
      })

      it('uniswapV3 exchange', async function () {
        // given
        const amountIn = parseUnits('0.001', 8)
        const {_path} = await uniswapV3Exchange.callStatic.getBestAmountOut(WBTC, WETH, amountIn)

        // when
        await wbtc.transfer(uniswapV3Exchange.address, amountIn)
        const tx1 = await uniswapV3Exchange.swapExactInput(_path, amountIn, 0, deployer.address)
        await wbtc.transfer(uniswapV3Exchange.address, amountIn)
        const tx2 = await uniswapV3Exchange.swapExactInput(_path, amountIn, 0, deployer.address)

        // then
        expect((await tx1.wait()).gasUsed).lte('130940')
        expect((await tx2.wait()).gasUsed).lte('110535')
      })
    })

    describe('3 length path', function () {
      it('uniswapV2 exchange', async function () {
        // given
        const amountIn = parseUnits('0.001', 8)
        const {_path} = await uniswapV2Exchange.callStatic.getBestAmountOut(WBTC, BTT, amountIn)

        // when
        await wbtc.transfer(uniswapV2Exchange.address, amountIn)
        const tx1 = await uniswapV2Exchange.swapExactInput(_path, amountIn, 0, deployer.address)
        await wbtc.transfer(uniswapV2Exchange.address, amountIn)
        const tx2 = await uniswapV2Exchange.swapExactInput(_path, amountIn, 0, deployer.address)

        // then
        expect((await tx1.wait()).gasUsed).lte('155607')
        expect((await tx2.wait()).gasUsed).lte('155607')
      })

      it('uniswapV3 exchange', async function () {
        // given
        const amountIn = parseUnits('0.001', 8)
        const {_path} = await uniswapV3Exchange.callStatic.getBestAmountOut(WBTC, BTT, amountIn)

        // when
        await wbtc.transfer(uniswapV3Exchange.address, amountIn)
        const tx1 = await uniswapV3Exchange.swapExactInput(_path, amountIn, 0, deployer.address)
        await wbtc.transfer(uniswapV3Exchange.address, amountIn)
        const tx2 = await uniswapV3Exchange.swapExactInput(_path, amountIn, 0, deployer.address)

        // then
        expect((await tx1.wait()).gasUsed).lte('197730')
        expect((await tx2.wait()).gasUsed).lte('177325')
      })
    })
  })

  describe('swapExactOutput', function () {
    describe('2 length path', function () {
      it('uniswapV2 exchange', async function () {
        // given
        const amountOut = parseUnits('0.001', 8)

        // when
        const {_amountIn: _amountIn1, _path: _path1} = await uniswapV2Exchange.callStatic.getBestAmountIn(
          WETH,
          WBTC,
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
          WETH,
          WBTC,
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
        expect((await tx1.wait()).gasUsed).lte('101598')
        expect((await tx2.wait()).gasUsed).lte('101598')
      })

      it('uniswapV3 exchange', async function () {
        // given
        const amountOut = parseUnits('0.001', 8)

        // when
        const {_path: _path1, _amountIn: _amountIn1} = await uniswapV3Exchange.callStatic.getBestAmountIn(
          WETH,
          WBTC,
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
          WETH,
          WBTC,
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
        expect((await tx1.wait()).gasUsed).lte('131685')
        expect((await tx2.wait()).gasUsed).lte('108784')
      })
    })

    describe('3 length path', function () {
      it('uniswapV2 exchange', async function () {
        // given
        const amountOut = parseUnits('0.001', 8)

        // when
        const {_path: _path1, _amountIn: _amountIn1} = await uniswapV2Exchange.callStatic.getBestAmountIn(
          BTT,
          WBTC,
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
          BTT,
          WBTC,
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
        expect((await tx1.wait()).gasUsed).lte('162531')
        expect((await tx2.wait()).gasUsed).lte('162531')
      })

      it('uniswapV3 exchange', async function () {
        // given
        const amountOut = parseUnits('0.001', 8)

        // when
        const {_path: _path1, _amountIn: _amountIn1} = await uniswapV3Exchange.callStatic.getBestAmountIn(
          BTT,
          WBTC,
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
          BTT,
          WBTC,
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
        expect((await tx1.wait()).gasUsed).lte('194871')
        expect((await tx2.wait()).gasUsed).lte('174562')
      })
    })
  })

  describe('Swapper', function () {
    describe('worst case: 3 exchanges + token not listed on chainlink + 3 length path', function () {
      it('getBestAmountOut', async function () {
        const amountIn = parseUnits('0.001', 8)
        const tx = await swapper.getBestAmountOut(WBTC, BTT, amountIn)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).lte('371430')
      })

      it('swapExactInput', async function () {
        // given
        const amountIn = parseUnits('0.001', 8)

        // when
        await wbtc.approve(swapper.address, amountIn)
        const tx1 = await swapper.swapExactInput(WBTC, BTT, amountIn, deployer.address)
        await wbtc.approve(swapper.address, amountIn)
        const tx2 = await swapper.swapExactInput(WBTC, BTT, amountIn, deployer.address)

        // then
        expect((await tx1.wait()).gasUsed).lte('548616')
        expect((await tx2.wait()).gasUsed).lte('528211')
      })

      it('getBestAmountIn', async function () {
        const amountOut = parseUnits('0.001', 8)
        const tx = await swapper.getBestAmountIn(BTT, WBTC, amountOut)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).lte('377509')
      })

      it('swapExactOutput', async function () {
        // given
        const amountOut = parseUnits('0.001', 8)
        const {_amountInMax} = await swapper.callStatic.getBestAmountIn(BTT, WBTC, amountOut)

        // when
        await btt.approve(swapper.address, _amountInMax)
        const tx1 = await swapper.swapExactOutput(BTT, WBTC, amountOut, deployer.address)

        await btt.approve(swapper.address, _amountInMax)
        const tx2 = await swapper.swapExactOutput(BTT, WBTC, amountOut, deployer.address)

        // then
        expect((await tx1.wait()).gasUsed).lte('533976')
        expect((await tx2.wait()).gasUsed).lte('533976')
      })

      describe('with default routing', function () {
        beforeEach(async function () {
          const defaultPath = ethers.utils.solidityPack(
            ['address', 'uint24', 'address', 'uint24', 'address'],
            [WBTC, uniswapV3DefaultPoolFee, WETH, uniswapV3DefaultPoolFee, BTT]
          )
          await swapper.setDefaultRouting(SwapType.EXACT_INPUT, WBTC, BTT, ExchangeType.UNISWAP_V3, defaultPath)

          await swapper.setDefaultRouting(SwapType.EXACT_OUTPUT, BTT, WBTC, ExchangeType.UNISWAP_V3, defaultPath)
        })

        it('getBestAmountOut', async function () {
          const amountIn = parseUnits('0.001', 8)
          const tx = await swapper.getBestAmountOut(WBTC, BTT, amountIn)
          const receipt = await tx.wait()
          expect(receipt.gasUsed).lte('160466')
        })

        it('swapExactInput', async function () {
          // given
          const amountIn = parseUnits('0.001', 8)

          // when
          await wbtc.approve(swapper.address, amountIn)
          const tx1 = await swapper.swapExactInput(WBTC, BTT, amountIn, deployer.address)
          await wbtc.approve(swapper.address, amountIn)
          const tx2 = await swapper.swapExactInput(WBTC, BTT, amountIn, deployer.address)

          // then
          expect((await tx1.wait()).gasUsed).lte('343402')
          expect((await tx2.wait()).gasUsed).lte('322997')
        })

        it('getBestAmountIn', async function () {
          const amountOut = parseUnits('0.001', 8)
          const tx = await swapper.getBestAmountIn(BTT, WBTC, amountOut)
          const receipt = await tx.wait()
          expect(receipt.gasUsed).lte('160489')
        })

        it('swapExactOutput', async function () {
          // given
          const amountOut = parseUnits('0.001', 8)
          const {_amountInMax} = await swapper.callStatic.getBestAmountIn(BTT, WBTC, amountOut)

          // when
          await btt.approve(swapper.address, _amountInMax)
          const tx1 = await swapper.swapExactOutput(BTT, WBTC, amountOut, deployer.address)
          await btt.approve(swapper.address, _amountInMax)
          const tx2 = await swapper.swapExactOutput(BTT, WBTC, amountOut, deployer.address)

          // then
          expect((await tx1.wait()).gasUsed).lte('346432')
          expect((await tx2.wait()).gasUsed).lte('326123')
        })
      })
    })

    describe('bad case: 3 exchanges + chainlink tokens + 3 length path', function () {
      it('getBestAmountOut', async function () {
        const amountIn = parseUnits('0.001', 8)
        const tx = await swapper.getBestAmountOut(WBTC, DAI, amountIn)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).lte('346141')
      })

      it('swapExactInput', async function () {
        // given
        const amountIn = parseUnits('0.001', 8)

        // when
        await wbtc.approve(swapper.address, amountIn)
        const tx1 = await swapper.swapExactInput(WBTC, DAI, amountIn, deployer.address)
        await wbtc.approve(swapper.address, amountIn)
        const tx2 = await swapper.swapExactInput(WBTC, DAI, amountIn, deployer.address)

        // then
        expect((await tx1.wait()).gasUsed).lte('430072')
        expect((await tx2.wait()).gasUsed).lte('430072')
      })

      it('getBestAmountIn', async function () {
        const amountOut = parseUnits('0.001', 8)
        const tx = await swapper.getBestAmountIn(DAI, WBTC, amountOut)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).lte('350032')
      })

      it('swapExactOutput', async function () {
        // given
        const amountOut = parseUnits('0.001', 8)
        const {_amountInMax} = await swapper.callStatic.getBestAmountIn(DAI, WBTC, amountOut)

        // when
        await dai.approve(swapper.address, _amountInMax)
        const tx1 = await swapper.swapExactOutput(DAI, WBTC, amountOut, deployer.address)
        await dai.approve(swapper.address, _amountInMax)
        const tx2 = await swapper.swapExactOutput(DAI, WBTC, amountOut, deployer.address)

        // then
        expect((await tx1.wait()).gasUsed).lte('441353')
        expect((await tx2.wait()).gasUsed).lte('441353')
      })

      describe('with default routing', function () {
        beforeEach(async function () {
          const defaultPath = ethers.utils.solidityPack(
            ['address', 'uint24', 'address', 'uint24', 'address'],
            [WBTC, uniswapV3DefaultPoolFee, WETH, uniswapV3DefaultPoolFee, DAI]
          )
          await swapper.setDefaultRouting(SwapType.EXACT_INPUT, WBTC, DAI, ExchangeType.UNISWAP_V3, defaultPath)

          await swapper.setDefaultRouting(SwapType.EXACT_OUTPUT, DAI, WBTC, ExchangeType.UNISWAP_V3, defaultPath)
        })

        it('getBestAmountOut', async function () {
          const amountIn = parseUnits('0.001', 8)
          const tx = await swapper.getBestAmountOut(WBTC, DAI, amountIn)
          const receipt = await tx.wait()
          expect(receipt.gasUsed).lte('123451')
        })

        it('swapExactInput', async function () {
          // given
          const amountIn = parseUnits('0.001', 8)

          // when
          await wbtc.approve(swapper.address, amountIn)
          const tx1 = await swapper.swapExactInput(WBTC, DAI, amountIn, deployer.address)
          await wbtc.approve(swapper.address, amountIn)
          const tx2 = await swapper.swapExactInput(WBTC, DAI, amountIn, deployer.address)

          // then
          expect((await tx1.wait()).gasUsed).lte('311374')
          expect((await tx2.wait()).gasUsed).lte('290969')
        })

        it('getBestAmountIn', async function () {
          const amountOut = parseUnits('0.001', 8)
          const tx = await swapper.getBestAmountIn(DAI, WBTC, amountOut)
          const receipt = await tx.wait()
          expect(receipt.gasUsed).lte('123475')
        })

        it('swapExactOutput', async function () {
          // given
          const amountOut = parseUnits('0.001', 8)
          const {_amountInMax} = await swapper.callStatic.getBestAmountIn(DAI, WBTC, amountOut)

          // when
          await dai.approve(swapper.address, _amountInMax)
          const tx1 = await swapper.swapExactOutput(DAI, WBTC, amountOut, deployer.address)
          await dai.approve(swapper.address, _amountInMax)
          const tx2 = await swapper.swapExactOutput(DAI, WBTC, amountOut, deployer.address)

          // then
          expect((await tx1.wait()).gasUsed).lte('310806')
          expect((await tx2.wait()).gasUsed).lte('287811')
        })
      })
    })

    describe('avg case: 2 exchanges + chainlink tokens + 3 length path', function () {
      beforeEach(async function () {
        await swapper.setExchange(ExchangeType.SUSHISWAP, ethers.constants.AddressZero)
      })

      it('getBestAmountOut', async function () {
        const amountIn = parseUnits('0.001', 8)
        const tx = await swapper.getBestAmountOut(WBTC, DAI, amountIn)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).lte('308820')
      })

      it('swapExactInput', async function () {
        // given
        const amountIn = parseUnits('0.001', 8)

        // when
        await wbtc.approve(swapper.address, amountIn)
        const tx1 = await swapper.swapExactInput(WBTC, DAI, amountIn, deployer.address)
        await wbtc.approve(swapper.address, amountIn)
        const tx2 = await swapper.swapExactInput(WBTC, DAI, amountIn, deployer.address)

        // then
        expect((await tx1.wait()).gasUsed).lte('392751')
        expect((await tx2.wait()).gasUsed).lte('392751')
      })

      it('getBestAmountIn', async function () {
        const amountOut = parseUnits('0.001', 8)
        const tx = await swapper.getBestAmountIn(DAI, WBTC, amountOut)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).lte('312482')
      })

      it('swapExactOutput', async function () {
        // given
        const amountOut = parseUnits('0.001', 8)
        const {_amountInMax} = await swapper.callStatic.getBestAmountIn(DAI, WBTC, amountOut)

        // when
        await dai.approve(swapper.address, _amountInMax)
        const tx1 = await swapper.swapExactOutput(DAI, WBTC, amountOut, deployer.address)
        await dai.approve(swapper.address, _amountInMax)
        const tx2 = await swapper.swapExactOutput(DAI, WBTC, amountOut, deployer.address)

        // then
        expect((await tx1.wait()).gasUsed).lte('403803')
        expect((await tx2.wait()).gasUsed).lte('403803')
      })

      describe('with default routing', function () {
        beforeEach(async function () {
          const defaultPath = ethers.utils.solidityPack(
            ['address', 'uint24', 'address', 'uint24', 'address'],
            [WBTC, uniswapV3DefaultPoolFee, WETH, uniswapV3DefaultPoolFee, DAI]
          )
          await swapper.setDefaultRouting(SwapType.EXACT_INPUT, WBTC, DAI, ExchangeType.UNISWAP_V3, defaultPath)

          await swapper.setDefaultRouting(SwapType.EXACT_OUTPUT, DAI, WBTC, ExchangeType.UNISWAP_V3, defaultPath)
        })

        it('getBestAmountOut', async function () {
          const amountIn = parseUnits('0.001', 8)
          const tx = await swapper.getBestAmountOut(WBTC, DAI, amountIn)
          const receipt = await tx.wait()
          expect(receipt.gasUsed).lte('123451')
        })

        it('swapExactInput', async function () {
          // given
          const amountIn = parseUnits('0.001', 8)

          // when
          await wbtc.approve(swapper.address, amountIn)
          const tx1 = await swapper.swapExactInput(WBTC, DAI, amountIn, deployer.address)
          await wbtc.approve(swapper.address, amountIn)
          const tx2 = await swapper.swapExactInput(WBTC, DAI, amountIn, deployer.address)

          // then
          expect((await tx1.wait()).gasUsed).lte('311374')
          expect((await tx2.wait()).gasUsed).lte('290969')
        })

        it('getBestAmountIn', async function () {
          const amountOut = parseUnits('0.001', 8)
          const tx = await swapper.getBestAmountIn(DAI, WBTC, amountOut)
          const receipt = await tx.wait()
          expect(receipt.gasUsed).lte('123475')
        })

        it('swapExactOutput', async function () {
          // given
          const amountOut = parseUnits('0.001', 8)
          const {_amountInMax} = await swapper.callStatic.getBestAmountIn(DAI, WBTC, amountOut)

          // when
          await dai.approve(swapper.address, _amountInMax)
          const tx1 = await swapper.swapExactOutput(DAI, WBTC, amountOut, deployer.address)
          await dai.approve(swapper.address, _amountInMax)
          const tx2 = await swapper.swapExactOutput(DAI, WBTC, amountOut, deployer.address)

          // then
          expect((await tx1.wait()).gasUsed).lte('310806')
          expect((await tx2.wait()).gasUsed).lte('287811')
        })
      })
    })

    describe('best case: 2 exchanges + chainlink tokens + 2 length path', function () {
      const abi = ethers.utils.defaultAbiCoder

      beforeEach(async function () {
        await swapper.setExchange(ExchangeType.SUSHISWAP, ethers.constants.AddressZero)
      })

      it('getBestAmountOut', async function () {
        const amountIn = parseUnits('0.001', 8)
        const tx = await swapper.getBestAmountOut(WBTC, WETH, amountIn)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).lte('216547')
      })

      it('swapExactInput', async function () {
        // given
        const amountIn = parseUnits('0.001', 8)

        // when
        await wbtc.approve(swapper.address, amountIn)
        const tx1 = await swapper.swapExactInput(WBTC, WETH, amountIn, deployer.address)
        await wbtc.approve(swapper.address, amountIn)
        const tx2 = await swapper.swapExactInput(WBTC, WETH, amountIn, deployer.address)

        // then
        expect((await tx1.wait()).gasUsed).lte('300040')
        expect((await tx2.wait()).gasUsed).lte('300040')
      })

      it('getBestAmountIn', async function () {
        const amountOut = parseUnits('0.001', 8)
        const tx = await swapper.getBestAmountIn(WETH, WBTC, amountOut)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).lte('219749')
      })

      it('swapExactOutput', async function () {
        // given
        const amountOut = parseUnits('0.001', 8)
        const {_amountInMax} = await swapper.callStatic.getBestAmountIn(WETH, WBTC, amountOut)

        // when
        await weth.approve(swapper.address, _amountInMax)
        const tx1 = await swapper.swapExactOutput(WETH, WBTC, amountOut, deployer.address)
        await weth.approve(swapper.address, _amountInMax)
        const tx2 = await swapper.swapExactOutput(WETH, WBTC, amountOut, deployer.address)

        // then
        expect((await tx1.wait()).gasUsed).lte('341336')
        expect((await tx2.wait()).gasUsed).lte('318435')
      })

      describe('with default routing', function () {
        beforeEach(async function () {
          await swapper.setDefaultRouting(
            SwapType.EXACT_INPUT,
            WBTC,
            WETH,
            ExchangeType.UNISWAP_V2,
            abi.encode(['address[]'], [[WBTC, WETH]])
          )
          await swapper.setDefaultRouting(
            SwapType.EXACT_OUTPUT,
            WETH,
            WBTC,
            ExchangeType.UNISWAP_V2,
            abi.encode(['address[]'], [[WETH, WBTC]])
          )
        })

        it('getBestAmountOut', async function () {
          const amountIn = parseUnits('0.001', 8)
          const tx = await swapper.getBestAmountOut(WBTC, WETH, amountIn)
          const receipt = await tx.wait()
          expect(receipt.gasUsed).lte('127934')
        })

        it('swapExactInput', async function () {
          // given
          const amountIn = parseUnits('0.001', 8)

          // when
          await wbtc.approve(swapper.address, amountIn)
          const tx1 = await swapper.swapExactInput(WBTC, WETH, amountIn, deployer.address)
          await wbtc.approve(swapper.address, amountIn)
          const tx2 = await swapper.swapExactInput(WBTC, WETH, amountIn, deployer.address)

          // then
          expect((await tx1.wait()).gasUsed).lte('218426')
          expect((await tx2.wait()).gasUsed).lte('218426')
        })

        it('getBestAmountIn', async function () {
          const amountOut = parseUnits('0.001', 8)
          const tx = await swapper.getBestAmountIn(WETH, WBTC, amountOut)
          const receipt = await tx.wait()
          expect(receipt.gasUsed).lte('127958')
        })

        it('swapExactOutput', async function () {
          // given
          const amountOut = parseUnits('0.001', 8)
          const {_amountInMax} = await swapper.callStatic.getBestAmountIn(WETH, WBTC, amountOut)
          await weth.approve(swapper.address, _amountInMax)
          const tx1 = await swapper.swapExactOutput(WETH, WBTC, amountOut, deployer.address)

          // when
          await weth.approve(swapper.address, _amountInMax)
          const tx2 = await swapper.swapExactOutput(WETH, WBTC, amountOut, deployer.address)

          // then
          expect((await tx1.wait()).gasUsed).lte('225046')
          expect((await tx2.wait()).gasUsed).lte('225046')
        })
      })
    })
  })
})
