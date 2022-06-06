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
} from '../../typechain-types'
import {Address} from '../../helpers'
import {ExchangeType, HOUR, increaseTime, parseEther, parseUnits, Provider, SwapType} from '../helpers'
import {FakeContract, smock} from '@defi-wonderland/smock'
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

describe('Swapper @mainnet', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let user: SignerWithAddress
  let invalidToken: SignerWithAddress
  let uniswapV2Exchange: UniswapV2LikeExchange
  let sushiswapExchange: UniswapV2LikeExchange
  let uniswapV3Exchange: UniswapV3Exchange
  let uniswapV3DefaultPoolFee: number
  let chainlinkAndFallbacksOracleFake: FakeContract
  let swapper: Swapper
  let weth: IERC20
  let dai: IERC20
  let wbtc: IERC20
  let usdc: IERC20
  let btt: IERC20

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer, user, invalidToken] = await ethers.getSigners()

    const uniswapV2LikeExchangeFactory = new UniswapV2LikeExchange__factory(deployer)

    uniswapV2Exchange = await uniswapV2LikeExchangeFactory.deploy(UNISWAP_V2_ROUTER_ADDRESS, WETH_ADDRESS)
    await uniswapV2Exchange.deployed()

    sushiswapExchange = await uniswapV2LikeExchangeFactory.deploy(SUSHISWAP_ROUTER_ADDRESS, WETH_ADDRESS)
    await sushiswapExchange.deployed()

    const uniswapV3ExchangeFactory = new UniswapV3Exchange__factory(deployer)
    uniswapV3Exchange = await uniswapV3ExchangeFactory.deploy(WETH_ADDRESS)
    await uniswapV3Exchange.deployed()
    uniswapV3DefaultPoolFee = await uniswapV3Exchange.defaultPoolFee()

    chainlinkAndFallbacksOracleFake = await smock.fake('ChainlinkAndFallbacksOracle')

    const swapperFactory = new Swapper__factory(deployer)
    swapper = await swapperFactory.deploy(chainlinkAndFallbacksOracleFake.address, MAX_SLIPPAGE)
    await swapper.deployed()

    await swapper.setExchange(ExchangeType.UNISWAP_V2, uniswapV2Exchange.address)
    await swapper.setExchange(ExchangeType.SUSHISWAP, sushiswapExchange.address)
    await swapper.setExchange(ExchangeType.UNISWAP_V3, uniswapV3Exchange.address)

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
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('gas usage', function () {
    const MAX_DEVIATION = parseEther('0.1') // 10%
    const STALE_PERIOD = ethers.constants.MaxUint256
    const DEFAULT_TWAP_PERIOD = HOUR
    const DEFAULT_POOLS_FEE = 3000 // 0.3%
    let uniswapV2Provider: UniswapV2LikePriceProvider
    let uniswapV3Provider: UniswapV3PriceProvider
    let chainlinkProvider: ChainlinkMainnetPriceProvider
    let aggregator: PriceProvidersAggregator
    let chainlinkAndFallbacksOracle: ChainlinkAndFallbacksOracle

    beforeEach(async function () {
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
      await swapper.updateOracle(chainlinkAndFallbacksOracle.address)
    })

    describe('worst case: 3 exchanges + non-chainlink token + 3 length path', function () {
      it('swapExactInput', async function () {
        const amountIn = parseUnits('1', 8)
        const {_path, _exchange} = await swapper.callStatic.getBestAmountOut(WBTC_ADDRESS, BTT_ADDRESS, amountIn)
        expect(_exchange).eq(uniswapV3Exchange.address)
        expect(_path).eq(
          ethers.utils.solidityPack(
            ['address', 'uint24', 'address', 'uint24', 'address'],
            [WBTC_ADDRESS, uniswapV3DefaultPoolFee, WETH_ADDRESS, uniswapV3DefaultPoolFee, BTT_ADDRESS]
          )
        )

        await wbtc.approve(swapper.address, amountIn)
        const tx = await swapper.swapExactInput(WBTC_ADDRESS, BTT_ADDRESS, amountIn, deployer.address)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).closeTo('516000', 1000)
      })

      it('swapExactOutput', async function () {
        const amountOut = parseUnits('1', 8)
        const {_path, _exchange} = await swapper.callStatic.getBestAmountIn(BTT_ADDRESS, WBTC_ADDRESS, amountOut)
        const {_amountIn} = await uniswapV3Exchange.callStatic.getBestAmountIn(BTT_ADDRESS, WBTC_ADDRESS, amountOut)
        expect(_exchange).eq(uniswapV3Exchange.address)
        expect(_path).eq(
          ethers.utils.solidityPack(
            ['address', 'uint24', 'address', 'uint24', 'address'],
            [WBTC_ADDRESS, uniswapV3DefaultPoolFee, WETH_ADDRESS, uniswapV3DefaultPoolFee, BTT_ADDRESS]
          )
        )

        await btt.approve(swapper.address, _amountIn.mul('10'))
        const tx = await swapper.swapExactOutput(BTT_ADDRESS, WBTC_ADDRESS, amountOut, deployer.address)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).closeTo('539000', 1000)
      })

      describe('with preferable path', function () {
        it('swapExactInput', async function () {
          // given
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

          // when
          const amountIn = parseUnits('1', 8)
          await wbtc.approve(swapper.address, amountIn)
          const tx = await swapper.swapExactInput(WBTC_ADDRESS, BTT_ADDRESS, amountIn, deployer.address)

          // then
          const receipt = await tx.wait()
          expect(receipt.gasUsed).closeTo('323000', 1000)
        })

        it('swapExactOutput', async function () {
          // given
          const preferablePath = ethers.utils.solidityPack(
            ['address', 'uint24', 'address', 'uint24', 'address'],
            [WBTC_ADDRESS, uniswapV3DefaultPoolFee, WETH_ADDRESS, uniswapV3DefaultPoolFee, BTT_ADDRESS]
          )
          await swapper.setPreferablePath(
            SwapType.EXACT_OUTPUT,
            BTT_ADDRESS,
            WBTC_ADDRESS,
            ExchangeType.UNISWAP_V3,
            preferablePath
          )

          // when
          const amountOut = parseUnits('1', 8)
          const {_amountInMax} = await swapper.callStatic.getBestAmountIn(BTT_ADDRESS, WBTC_ADDRESS, amountOut)
          await btt.approve(swapper.address, _amountInMax)
          const tx = await swapper.swapExactOutput(BTT_ADDRESS, WBTC_ADDRESS, amountOut, deployer.address)

          // then
          const receipt = await tx.wait()
          expect(receipt.gasUsed).closeTo('344000', 1000)
        })
      })
    })

    describe('avg case: 3 exchanges + chainlink tokens + 3 length path', function () {
      it('swapExactInput', async function () {
        const amountIn = parseUnits('1', 8)
        const {_path, _exchange} = await swapper.callStatic.getBestAmountOut(WBTC_ADDRESS, DAI_ADDRESS, amountIn)
        expect(_exchange).eq(uniswapV3Exchange.address)
        expect(_path).eq(
          ethers.utils.solidityPack(
            ['address', 'uint24', 'address', 'uint24', 'address'],
            [WBTC_ADDRESS, uniswapV3DefaultPoolFee, WETH_ADDRESS, uniswapV3DefaultPoolFee, DAI_ADDRESS]
          )
        )

        await wbtc.approve(swapper.address, amountIn)
        const tx = await swapper.swapExactInput(WBTC_ADDRESS, DAI_ADDRESS, amountIn, deployer.address)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).closeTo('498000', 1000)
      })

      it('swapExactOutput', async function () {
        const amountOut = parseUnits('1', 8)
        const {_path, _exchange} = await swapper.callStatic.getBestAmountIn(DAI_ADDRESS, WBTC_ADDRESS, amountOut)
        const {_amountIn} = await uniswapV3Exchange.callStatic.getBestAmountIn(DAI_ADDRESS, WBTC_ADDRESS, amountOut)
        expect(_exchange).eq(uniswapV3Exchange.address)
        expect(_path).eq(
          ethers.utils.solidityPack(
            ['address', 'uint24', 'address', 'uint24', 'address'],
            [WBTC_ADDRESS, uniswapV3DefaultPoolFee, WETH_ADDRESS, uniswapV3DefaultPoolFee, DAI_ADDRESS]
          )
        )

        await dai.approve(swapper.address, _amountIn.mul('10'))
        const tx = await swapper.swapExactOutput(DAI_ADDRESS, WBTC_ADDRESS, amountOut, deployer.address)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).closeTo('520000', 1000)
      })

      describe('with preferable path', function () {
        it('swapExactInput', async function () {
          // given
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

          // when
          const amountIn = parseUnits('1', 8)
          await wbtc.approve(swapper.address, amountIn)
          const tx = await swapper.swapExactInput(WBTC_ADDRESS, DAI_ADDRESS, amountIn, deployer.address)

          // then
          const receipt = await tx.wait()
          expect(receipt.gasUsed).closeTo('303000', 1000)
        })

        it('swapExactOutput', async function () {
          // given
          const preferablePath = ethers.utils.solidityPack(
            ['address', 'uint24', 'address', 'uint24', 'address'],
            [WBTC_ADDRESS, uniswapV3DefaultPoolFee, WETH_ADDRESS, uniswapV3DefaultPoolFee, DAI_ADDRESS]
          )
          await swapper.setPreferablePath(
            SwapType.EXACT_OUTPUT,
            DAI_ADDRESS,
            WBTC_ADDRESS,
            ExchangeType.UNISWAP_V3,
            preferablePath
          )

          // when
          const amountOut = parseUnits('1', 8)
          const {_amountInMax} = await swapper.callStatic.getBestAmountIn(DAI_ADDRESS, WBTC_ADDRESS, amountOut)
          await dai.approve(swapper.address, _amountInMax)
          const tx = await swapper.swapExactOutput(DAI_ADDRESS, WBTC_ADDRESS, amountOut, deployer.address)

          // then
          const receipt = await tx.wait()
          expect(receipt.gasUsed).closeTo('320831', 1000)
        })
      })
    })

    describe('best case: 2 exchanges + chainlink tokens + 2 length path', function () {
      const abi = ethers.utils.defaultAbiCoder

      beforeEach(async function () {
        await swapper.setExchange(ExchangeType.UNISWAP_V3, ethers.constants.AddressZero)
      })

      it('swapExactInput', async function () {
        const amountIn = parseUnits('1', 8)
        const {_path, _exchange} = await swapper.callStatic.getBestAmountOut(WBTC_ADDRESS, WETH_ADDRESS, amountIn)
        expect(_exchange).eq(sushiswapExchange.address)
        expect(_path).eq(abi.encode(['address[]'], [[WBTC_ADDRESS, WETH_ADDRESS]]))

        await wbtc.approve(swapper.address, amountIn)
        const tx = await swapper.swapExactInput(WBTC_ADDRESS, WETH_ADDRESS, amountIn, deployer.address)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).closeTo('245000', 1000)
      })

      it('swapExactOutput', async function () {
        const amountOut = parseUnits('1', 8)
        const {_exchange, _path} = await swapper.callStatic.getBestAmountIn(WETH_ADDRESS, WBTC_ADDRESS, amountOut)
        const {_amountIn} = await sushiswapExchange.callStatic.getBestAmountIn(WETH_ADDRESS, WBTC_ADDRESS, amountOut)
        expect(_path).eq(abi.encode(['address[]'], [[WETH_ADDRESS, WBTC_ADDRESS]]))
        expect(_exchange).eq(sushiswapExchange.address)

        await weth.approve(swapper.address, _amountIn.mul('10'))
        const tx = await swapper.swapExactOutput(WETH_ADDRESS, WBTC_ADDRESS, amountOut, deployer.address)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).closeTo('273000', 1000)
      })

      describe('with preferable path', function () {
        it('swapExactInput', async function () {
          // given
          const preferablePath = abi.encode(['address[]'], [[WBTC_ADDRESS, WETH_ADDRESS]])
          await swapper.setPreferablePath(
            SwapType.EXACT_INPUT,
            WBTC_ADDRESS,
            WETH_ADDRESS,
            ExchangeType.SUSHISWAP,
            preferablePath
          )

          // when
          const amountIn = parseUnits('1', 8)
          await wbtc.approve(swapper.address, amountIn)
          const tx = await swapper.swapExactInput(WBTC_ADDRESS, WETH_ADDRESS, amountIn, deployer.address)

          // then
          const receipt = await tx.wait()
          expect(receipt.gasUsed).closeTo('224000', 1000)
        })

        it('swapExactOutput', async function () {
          // given
          const preferablePath = abi.encode(['address[]'], [[WETH_ADDRESS, WBTC_ADDRESS]])
          await swapper.setPreferablePath(
            SwapType.EXACT_OUTPUT,
            WETH_ADDRESS,
            WBTC_ADDRESS,
            ExchangeType.SUSHISWAP,
            preferablePath
          )

          // when
          const amountOut = parseUnits('1', 8)
          const {_amountInMax} = await swapper.callStatic.getBestAmountIn(WETH_ADDRESS, WBTC_ADDRESS, amountOut)
          await weth.approve(swapper.address, _amountInMax)
          const tx = await swapper.swapExactOutput(WETH_ADDRESS, WBTC_ADDRESS, amountOut, deployer.address)
          const receipt = await tx.wait()
          expect(receipt.gasUsed).closeTo('247000', 1000)
        })
      })
    })
  })

  describe('getBestAmountIn', function () {
    it('should revert if swap is impossible', async function () {
      const amountOut = parseEther('1,000')
      const call0 = swapper.getBestAmountIn(WETH_ADDRESS, invalidToken.address, amountOut)
      const call1 = swapper.getBestAmountIn(DAI_ADDRESS, invalidToken.address, amountOut)
      await expect(call0).revertedWith('invalid-swap')
      await expect(call1).revertedWith('invalid-swap')
    })

    it('should get best amountIn for WETH->DAI', async function () {
      // given
      const amountOut = parseEther('3,222')
      const {_amountIn: bestAmountIn, _path: bestPath} = await sushiswapExchange.callStatic.getBestAmountIn(
        WETH_ADDRESS,
        DAI_ADDRESS,
        amountOut
      )
      const {_amountIn: amountInA} = await uniswapV2Exchange.callStatic.getBestAmountIn(
        WETH_ADDRESS,
        DAI_ADDRESS,
        amountOut
      )
      expect(bestAmountIn).lt(amountInA)
      expect(bestAmountIn).closeTo(parseEther('1'), parseEther('0.1'))

      // when
      const {_exchange, _path} = await swapper.callStatic.getBestAmountIn(WETH_ADDRESS, DAI_ADDRESS, amountOut)

      // then
      expect(_exchange).eq(sushiswapExchange.address)
      expect(_path).deep.eq(bestPath)
    })

    it('should get best amountIn for USDC->DAI', async function () {
      // given
      const amountOut = parseEther('1,000')
      const {_amountIn: amountInA} = await sushiswapExchange.callStatic.getBestAmountIn(
        USDC_ADDRESS,
        DAI_ADDRESS,
        amountOut
      )
      const {_amountIn: bestAmountIn, _path: bestPath} = await uniswapV2Exchange.callStatic.getBestAmountIn(
        USDC_ADDRESS,
        DAI_ADDRESS,
        amountOut
      )
      expect(bestAmountIn).lt(amountInA)
      expect(bestAmountIn).closeTo(parseUnits('1002', 6), parseUnits('1', 6))

      // when
      const {_exchange, _path} = await swapper.callStatic.getBestAmountIn(USDC_ADDRESS, DAI_ADDRESS, amountOut)

      // then
      expect(_exchange).eq(uniswapV2Exchange.address)
      expect(_path).deep.eq(bestPath)
    })

    it('should get best amountIn for WBTC->DAI', async function () {
      // given
      const amountOut = parseEther('43,221')
      const {_amountIn: amountInA} = await uniswapV2Exchange.callStatic.getBestAmountIn(
        WBTC_ADDRESS,
        DAI_ADDRESS,
        amountOut
      )
      const {_amountIn: amountInB} = await sushiswapExchange.callStatic.getBestAmountIn(
        WBTC_ADDRESS,
        DAI_ADDRESS,
        amountOut
      )
      const {_amountIn: bestAmountIn, _path: bestPath} = await uniswapV3Exchange.callStatic.getBestAmountIn(
        WBTC_ADDRESS,
        DAI_ADDRESS,
        amountOut
      )
      expect(bestAmountIn).lt(amountInB).lt(amountInA)
      expect(bestAmountIn).closeTo(parseUnits('1', 8), parseUnits('0.1', 8))

      // when
      const {_exchange, _path} = await swapper.callStatic.getBestAmountIn(WBTC_ADDRESS, DAI_ADDRESS, amountOut)

      // then
      expect(_exchange).eq(uniswapV3Exchange.address)
      expect(_path).deep.eq(bestPath)
    })
  })

  describe('getBestAmountOut', function () {
    it('should revert if swap is impossible', async function () {
      const amountIn = parseEther('1,000')
      const call0 = swapper.getBestAmountOut(WETH_ADDRESS, invalidToken.address, amountIn)
      const call1 = swapper.getBestAmountOut(DAI_ADDRESS, invalidToken.address, amountIn)
      await expect(call0).revertedWith('invalid-swap')
      await expect(call1).revertedWith('invalid-swap')
    })

    it('should get best amountOut for WETH->DAI', async function () {
      // given
      const amountIn = parseEther('1')
      const {_amountOut: amountOutA} = await uniswapV2Exchange.callStatic.getBestAmountOut(
        WETH_ADDRESS,
        DAI_ADDRESS,
        amountIn
      )
      const {_amountOut: bestAmountOut, _path: bestPath} = await sushiswapExchange.callStatic.getBestAmountOut(
        WETH_ADDRESS,
        DAI_ADDRESS,
        amountIn
      )
      expect(bestAmountOut).gt(amountOutA)
      expect(bestAmountOut).closeTo(parseEther('3,228'), parseEther('1'))

      // when
      const {_exchange, _path} = await swapper.callStatic.getBestAmountOut(WETH_ADDRESS, DAI_ADDRESS, amountIn)

      // then
      expect(_exchange).eq(sushiswapExchange.address)
      expect(_path).deep.eq(bestPath)
    })

    it('should get best amountOut for USDC->DAI', async function () {
      // given
      const amountIn = parseUnits('1,000', 6)
      const {_amountOut: amountOutA} = await sushiswapExchange.callStatic.getBestAmountOut(
        USDC_ADDRESS,
        DAI_ADDRESS,
        amountIn
      )
      const {_amountOut: bestAmountOut, _path: bestPath} = await uniswapV2Exchange.callStatic.getBestAmountOut(
        USDC_ADDRESS,
        DAI_ADDRESS,
        amountIn
      )
      expect(bestAmountOut).gt(amountOutA)
      expect(bestAmountOut).closeTo(parseEther('997'), parseEther('1'))

      // when
      const {_exchange, _path} = await swapper.callStatic.getBestAmountOut(USDC_ADDRESS, DAI_ADDRESS, amountIn)

      // then
      expect(_exchange).eq(uniswapV2Exchange.address)
      expect(_path).deep.eq(bestPath)
    })

    it('should get best amountOut for WBTC->DAI', async function () {
      // given
      const amountIn = parseUnits('1', 8)
      const {_amountOut: amountOutA} = await uniswapV2Exchange.callStatic.getBestAmountOut(
        WBTC_ADDRESS,
        DAI_ADDRESS,
        amountIn
      )
      const {_amountOut: amountOutB} = await sushiswapExchange.callStatic.getBestAmountOut(
        WBTC_ADDRESS,
        DAI_ADDRESS,
        amountIn
      )
      const {_amountOut: bestAmountOut, _path: bestPath} = await uniswapV3Exchange.callStatic.getBestAmountOut(
        WBTC_ADDRESS,
        DAI_ADDRESS,
        amountIn
      )

      expect(bestAmountOut).gt(amountOutB).gt(amountOutA)
      expect(bestAmountOut).closeTo(parseEther('43,515'), parseEther('1'))

      // when
      const {_exchange, _path} = await swapper.callStatic.getBestAmountOut(WBTC_ADDRESS, DAI_ADDRESS, amountIn)

      // then
      expect(_exchange).eq(uniswapV3Exchange.address)
      expect(_path).deep.eq(bestPath)
    })
  })

  describe('swapExactInput', function () {
    it('should revert if slippage is too high', async function () {
      // given
      const amountIn = parseUnits('1', 8)
      const {_exchange} = await swapper.callStatic.getBestAmountOut(WBTC_ADDRESS, USDC_ADDRESS, amountIn)
      expect(_exchange).eq(sushiswapExchange.address)
      const {_amountOut} = await sushiswapExchange.callStatic.getBestAmountOut(WBTC_ADDRESS, USDC_ADDRESS, amountIn)

      // when
      chainlinkAndFallbacksOracleFake.quote.returns(() => _amountOut.mul('10'))
      await wbtc.approve(swapper.address, amountIn)
      const tx = swapper.swapExactInput(WBTC_ADDRESS, USDC_ADDRESS, amountIn, deployer.address)

      // then
      await expect(tx).reverted
    })

    it('should perform an exact input swap', async function () {
      // given
      const amountIn = parseUnits('1', 8)
      const {_exchange} = await swapper.callStatic.getBestAmountOut(WBTC_ADDRESS, USDC_ADDRESS, amountIn)
      expect(_exchange).eq(sushiswapExchange.address)
      const {_amountOut} = await sushiswapExchange.callStatic.getBestAmountOut(WBTC_ADDRESS, USDC_ADDRESS, amountIn)
      const wbtcBefore = await wbtc.balanceOf(deployer.address)
      const usdcBefore = await usdc.balanceOf(deployer.address)

      // when
      chainlinkAndFallbacksOracleFake.quote.returns(() => _amountOut)
      await wbtc.approve(swapper.address, amountIn)
      await swapper.swapExactInput(WBTC_ADDRESS, USDC_ADDRESS, amountIn, deployer.address)

      // then
      const wbtcAfter = await wbtc.balanceOf(deployer.address)
      const usdcAfter = await usdc.balanceOf(deployer.address)
      expect(wbtcAfter).eq(wbtcBefore.sub(amountIn))
      expect(usdcAfter).eq(usdcBefore.add(_amountOut)) // no slippage scenario
    })
  })

  describe('swapExactOutput', function () {
    it('should revert if slippage is too high', async function () {
      // given
      const amountOut = parseUnits('1', 8)
      const {_exchange, _amountInMax} = await swapper.callStatic.getBestAmountIn(USDC_ADDRESS, WBTC_ADDRESS, amountOut)
      expect(_exchange).eq(uniswapV3Exchange.address)
      const {_amountIn} = await uniswapV3Exchange.callStatic.getBestAmountIn(USDC_ADDRESS, WBTC_ADDRESS, amountOut)
      chainlinkAndFallbacksOracleFake.quote.returns(() => _amountIn.div('10'))

      // when
      await usdc.approve(swapper.address, _amountInMax)
      const tx = swapper.swapExactOutput(USDC_ADDRESS, WBTC_ADDRESS, amountOut, deployer.address)

      // then
      await expect(tx).reverted
    })

    it('should perform an exact output swap', async function () {
      // given
      const amountOut = parseUnits('1', 8)
      const {_exchange} = await swapper.callStatic.getBestAmountIn(USDC_ADDRESS, WBTC_ADDRESS, amountOut)
      expect(_exchange).eq(uniswapV3Exchange.address)
      const {_amountIn} = await uniswapV3Exchange.callStatic.getBestAmountIn(USDC_ADDRESS, WBTC_ADDRESS, amountOut)
      const usdcBefore = await usdc.balanceOf(deployer.address)
      const wbtcBefore = await wbtc.balanceOf(deployer.address)

      // when
      chainlinkAndFallbacksOracleFake.quote.returns(() => _amountIn)
      const amountInMax = _amountIn.mul(parseEther('1').mul(MAX_SLIPPAGE)).div(parseEther('1'))
      await usdc.approve(swapper.address, amountInMax)
      await swapper.swapExactOutput(USDC_ADDRESS, WBTC_ADDRESS, amountOut, deployer.address)

      // then
      const usdcAfter = await usdc.balanceOf(deployer.address)
      const wbtcAfter = await wbtc.balanceOf(deployer.address)
      const actualAmountIn = usdcBefore.sub(usdcAfter)
      const actualAmountOut = wbtcAfter.sub(wbtcBefore)
      expect(actualAmountIn).closeTo(_amountIn, parseUnits('50', 6))
      expect(actualAmountOut).eq(amountOut)
    })

    it('should return remaining if any', async function () {
      // given
      const amountOut = parseUnits('1', 8)
      const {_exchange} = await swapper.callStatic.getBestAmountIn(USDC_ADDRESS, WBTC_ADDRESS, amountOut)
      expect(_exchange).eq(uniswapV3Exchange.address)
      const {_amountIn} = await uniswapV3Exchange.callStatic.getBestAmountIn(USDC_ADDRESS, WBTC_ADDRESS, amountOut)
      const usdcBefore = await usdc.balanceOf(deployer.address)
      const wbtcBefore = await wbtc.balanceOf(deployer.address)

      // when
      chainlinkAndFallbacksOracleFake.quote.returns(() => _amountIn)
      await usdc.approve(swapper.address, _amountIn.mul('10'))
      await swapper.swapExactOutput(USDC_ADDRESS, WBTC_ADDRESS, amountOut, deployer.address)
      expect(await usdc.balanceOf(swapper.address)).eq(0)

      // then
      const usdcAfter = await usdc.balanceOf(deployer.address)
      const wbtcAfter = await wbtc.balanceOf(deployer.address)
      const actualAmountIn = usdcBefore.sub(usdcAfter)
      const actualAmountOut = wbtcAfter.sub(wbtcBefore)
      expect(actualAmountIn).closeTo(_amountIn, parseUnits('50', 6))
      expect(actualAmountOut).eq(amountOut)
    })
  })

  describe('setExchange', function () {
    it('should revert if not governor', async function () {
      const tx = swapper.connect(user).setExchange(ExchangeType.UNISWAP_V2, ethers.constants.AddressZero)
      await expect(tx).revertedWith('not-governor')
    })

    it('should add exchange', async function () {
      // given
      const before = await swapper.addressOf(ExchangeType.PANGOLIN)
      expect(before).eq(ethers.constants.AddressZero)

      // when
      await swapper.setExchange(ExchangeType.PANGOLIN, user.address)

      // then
      const after = await swapper.addressOf(ExchangeType.PANGOLIN)
      expect(after).eq(user.address)
    })

    it('should update exchange', async function () {
      // given
      const before = await swapper.addressOf(ExchangeType.UNISWAP_V2)
      expect(before).eq(uniswapV2Exchange.address)

      // when
      await swapper.setExchange(ExchangeType.UNISWAP_V2, user.address)

      // then
      const after = await swapper.addressOf(ExchangeType.UNISWAP_V2)
      expect(after).eq(user.address)
    })

    it('should remove exchange', async function () {
      // given
      const before = await swapper.addressOf(ExchangeType.UNISWAP_V2)
      expect(before).eq(uniswapV2Exchange.address)

      // when
      await swapper.setExchange(ExchangeType.UNISWAP_V2, ethers.constants.AddressZero)

      // then
      const after = await swapper.addressOf(ExchangeType.UNISWAP_V2)
      expect(after).eq(ethers.constants.AddressZero)
    })
  })

  describe('updateMaxSlippage', function () {
    it('should revert if not governor', async function () {
      const tx = swapper.connect(user).updateMaxSlippage(0)
      await expect(tx).revertedWith('not-governor')
    })

    it('should update max slippage', async function () {
      // given
      const before = await swapper.maxSlippage()

      // when
      await swapper.updateMaxSlippage(before.mul('2'))

      // then
      const after = await swapper.maxSlippage()
      expect(after).not.eq(before)
    })
  })

  describe('updateOracle', function () {
    it('should revert if not governor', async function () {
      const tx = swapper.connect(user).updateOracle(user.address)
      await expect(tx).revertedWith('not-governor')
    })

    it('should update oracle', async function () {
      // given
      const before = await swapper.oracle()

      // when
      await swapper.updateOracle(user.address)

      // then
      const after = await swapper.oracle()
      expect(after).not.eq(before)
    })
  })

  describe('setPreferablePath', function () {
    it('should revert if not governor', async function () {
      const tx = swapper
        .connect(user)
        .setPreferablePath(SwapType.EXACT_INPUT, WETH_ADDRESS, WBTC_ADDRESS, ExchangeType.UNISWAP_V3, '0x')
      await expect(tx).revertedWith('not-governor')
    })

    it('should add a preferable path', async function () {
      // given
      const key = ethers.utils.solidityPack(
        ['uint8', 'address', 'address'],
        [SwapType.EXACT_INPUT, DAI_ADDRESS, WBTC_ADDRESS]
      )
      const before = await swapper.preferablePaths(key)
      expect(before).eq('0x')

      // when
      const exchangeType = ExchangeType.UNISWAP_V2
      const path = ethers.utils.defaultAbiCoder.encode(['address[]'], [[DAI_ADDRESS, WETH_ADDRESS, WBTC_ADDRESS]])
      await swapper.setPreferablePath(SwapType.EXACT_INPUT, DAI_ADDRESS, WBTC_ADDRESS, exchangeType, path)

      // then
      const after = await swapper.preferablePaths(key)
      expect(after).eq(ethers.utils.defaultAbiCoder.encode(['uint8', 'bytes'], [exchangeType, path]))
    })

    it('should remove a preferable path', async function () {
      // given
      const key = ethers.utils.solidityPack(
        ['uint8', 'address', 'address'],
        [SwapType.EXACT_INPUT, DAI_ADDRESS, WBTC_ADDRESS]
      )
      const exchangeType = ExchangeType.UNISWAP_V2
      const path = ethers.utils.defaultAbiCoder.encode(['address[]'], [[DAI_ADDRESS, WETH_ADDRESS, WBTC_ADDRESS]])
      await swapper.setPreferablePath(SwapType.EXACT_INPUT, DAI_ADDRESS, WBTC_ADDRESS, exchangeType, path)
      const before = await swapper.preferablePaths(key)
      expect(before).eq(ethers.utils.defaultAbiCoder.encode(['uint8', 'bytes'], [exchangeType, path]))

      // when
      await swapper.setPreferablePath(SwapType.EXACT_INPUT, DAI_ADDRESS, WBTC_ADDRESS, exchangeType, '0x')

      // then
      const after = await swapper.preferablePaths(key)
      expect(after).eq('0x')
    })
  })
})
