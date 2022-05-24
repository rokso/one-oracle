/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {
  UniswapV2LikeExchange,
  UniswapV2LikeExchange__factory,
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
import Address from '../../helpers/address'
import {HOUR, increaseTime, parseEther, parseUnits, Provider} from '../helpers'
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
  let invalidToken: SignerWithAddress
  let uniswapV2Exchange: UniswapV2LikeExchange
  let sushiswapExchange: UniswapV2LikeExchange
  let chainlinkAndFallbacksOracleFake: FakeContract
  let swapper: Swapper
  let weth: IERC20
  let dai: IERC20
  let wbtc: IERC20
  let usdc: IERC20
  let btt: IERC20

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer, invalidToken] = await ethers.getSigners()

    const uniswapV2LikeExchangeFactory = new UniswapV2LikeExchange__factory(deployer)

    uniswapV2Exchange = await uniswapV2LikeExchangeFactory.deploy(UNISWAP_V2_ROUTER_ADDRESS, WETH_ADDRESS)
    await uniswapV2Exchange.deployed()

    sushiswapExchange = await uniswapV2LikeExchangeFactory.deploy(SUSHISWAP_ROUTER_ADDRESS, WETH_ADDRESS)
    await sushiswapExchange.deployed()

    chainlinkAndFallbacksOracleFake = await smock.fake('ChainlinkAndFallbacksOracle')

    const swapperFactory = new Swapper__factory(deployer)
    swapper = await swapperFactory.deploy(chainlinkAndFallbacksOracleFake.address, MAX_SLIPPAGE)
    await swapper.deployed()

    await swapper.addExchange(uniswapV2Exchange.address)
    await swapper.addExchange(sushiswapExchange.address)

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

    describe('worst case - non-chainlink token + 3 length path', function () {
      it('swapExactInput', async function () {
        const amountIn = parseUnits('1', 8)
        const {_path} = await swapper.getBestAmountOut(WBTC_ADDRESS, BTT_ADDRESS, amountIn)
        expect(_path).deep.eq([WBTC_ADDRESS, WETH_ADDRESS, BTT_ADDRESS])

        await wbtc.approve(swapper.address, amountIn)
        const tx = await swapper.swapExactInput(WBTC_ADDRESS, BTT_ADDRESS, amountIn, deployer.address)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).closeTo('348000', 1000)
      })

      it('swapExactOutput', async function () {
        const amountOut = parseUnits('1', 8)
        const {_amountIn, _path} = await swapper.getBestAmountIn(BTT_ADDRESS, WBTC_ADDRESS, amountOut)
        expect(_path).deep.eq([BTT_ADDRESS, WETH_ADDRESS, WBTC_ADDRESS])

        await btt.approve(swapper.address, _amountIn.mul('10'))
        const tx = await swapper.swapExactOutput(BTT_ADDRESS, WBTC_ADDRESS, amountOut, deployer.address)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).closeTo('381000', 1000)
      })
    })

    describe('best case - chainlink tokens + 2 length path', function () {
      it('swapExactInput', async function () {
        const amountIn = parseUnits('1', 8)
        const {_path} = await swapper.getBestAmountOut(WBTC_ADDRESS, WETH_ADDRESS, amountIn)
        expect(_path).deep.eq([WBTC_ADDRESS, WETH_ADDRESS])

        await wbtc.approve(swapper.address, amountIn)
        const tx = await swapper.swapExactInput(WBTC_ADDRESS, WETH_ADDRESS, amountIn, deployer.address)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).closeTo('234000', 1000)
      })

      it('swapExactOutput', async function () {
        const amountOut = parseUnits('1', 8)
        const {_amountIn, _path} = await swapper.getBestAmountIn(WETH_ADDRESS, WBTC_ADDRESS, amountOut)
        expect(_path).deep.eq([WETH_ADDRESS, WBTC_ADDRESS])

        await weth.approve(swapper.address, _amountIn.mul('10'))
        const tx = await swapper.swapExactOutput(WETH_ADDRESS, WBTC_ADDRESS, amountOut, deployer.address)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).closeTo('264000', 1000)
      })
    })
  })

  describe('getBestAmountIn', function () {
    it('should revert if swap is impossible', async function () {
      const amountOut = parseEther('1,000')
      const call0 = swapper.getBestAmountIn(WETH_ADDRESS, invalidToken.address, amountOut)
      const call1 = swapper.getBestAmountIn(DAI_ADDRESS, invalidToken.address, amountOut)
      await expect(call0).revertedWith('no-path-found')
      await expect(call1).revertedWith('no-path-found')
    })

    it('should get best amountIn for WETH->DAI', async function () {
      // given
      const amountOut = parseEther('3,222')
      const {_amountIn: bestAmountIn, _path: bestPath} = await sushiswapExchange.getBestAmountIn(
        WETH_ADDRESS,
        DAI_ADDRESS,
        amountOut
      )
      const {_amountIn: amountInA} = await uniswapV2Exchange.getBestAmountIn(WETH_ADDRESS, DAI_ADDRESS, amountOut)
      expect(bestAmountIn).lt(amountInA)
      expect(bestAmountIn).closeTo(parseEther('1'), parseEther('0.1'))

      // when
      const {_amountIn, _path} = await swapper.getBestAmountIn(WETH_ADDRESS, DAI_ADDRESS, amountOut)

      // then
      expect(_amountIn).eq(bestAmountIn)
      expect(_path).deep.eq(bestPath)
    })

    it('should get best amountIn for USDC->DAI', async function () {
      // given
      const amountOut = parseEther('1,000')
      const {_amountIn: amountInA} = await sushiswapExchange.getBestAmountIn(USDC_ADDRESS, DAI_ADDRESS, amountOut)
      const {_amountIn: bestAmountIn, _path: bestPath} = await uniswapV2Exchange.getBestAmountIn(
        USDC_ADDRESS,
        DAI_ADDRESS,
        amountOut
      )
      expect(bestAmountIn).lt(amountInA)
      expect(bestAmountIn).closeTo(parseUnits('1002', 6), parseUnits('1', 6))

      // when
      const {_amountIn, _path} = await swapper.getBestAmountIn(USDC_ADDRESS, DAI_ADDRESS, amountOut)

      // then
      expect(_amountIn).eq(bestAmountIn)
      expect(_path).deep.eq(bestPath)
    })

    it('should get best amountIn for WBTC->DAI', async function () {
      // given
      const amountOut = parseEther('43,221')
      const {_amountIn: amountInA} = await uniswapV2Exchange.getBestAmountIn(WBTC_ADDRESS, DAI_ADDRESS, amountOut)
      const {_amountIn: bestAmountIn, _path: bestPath} = await sushiswapExchange.getBestAmountIn(
        WBTC_ADDRESS,
        DAI_ADDRESS,
        amountOut
      )
      expect(bestAmountIn).lt(amountInA)
      expect(bestAmountIn).closeTo(parseUnits('1', 8), parseUnits('0.1', 8))

      // when
      const {_amountIn, _path} = await swapper.getBestAmountIn(WBTC_ADDRESS, DAI_ADDRESS, amountOut)

      // then
      expect(_amountIn).eq(bestAmountIn)
      expect(_path).deep.eq(bestPath)
    })
  })

  describe('getBestAmountOut', function () {
    it('should revert if swap is impossible', async function () {
      const amountIn = parseEther('1,000')
      const call0 = swapper.getBestAmountOut(WETH_ADDRESS, invalidToken.address, amountIn)
      const call1 = swapper.getBestAmountOut(DAI_ADDRESS, invalidToken.address, amountIn)
      await expect(call0).revertedWith('no-path-found')
      await expect(call1).revertedWith('no-path-found')
    })

    it('should get best amountOut for WETH->DAI', async function () {
      // given
      const amountIn = parseEther('1')
      const {_amountOut: amountOutA} = await uniswapV2Exchange.getBestAmountOut(WETH_ADDRESS, DAI_ADDRESS, amountIn)
      const {_amountOut: bestAmountOut, _path: bestPath} = await sushiswapExchange.getBestAmountOut(
        WETH_ADDRESS,
        DAI_ADDRESS,
        amountIn
      )
      expect(bestAmountOut).gt(amountOutA)
      expect(bestAmountOut).closeTo(parseEther('3,228'), parseEther('1'))

      // when
      const {_amountOut, _path} = await swapper.getBestAmountOut(WETH_ADDRESS, DAI_ADDRESS, amountIn)

      // then
      expect(_amountOut).eq(bestAmountOut)
      expect(_path).deep.eq(bestPath)
    })

    it('should get best amountOut for USDC->DAI', async function () {
      // given
      const amountIn = parseUnits('1,000', 6)
      const {_amountOut: amountOutA} = await sushiswapExchange.getBestAmountOut(USDC_ADDRESS, DAI_ADDRESS, amountIn)
      const {_amountOut: bestAmountOut, _path: bestPath} = await uniswapV2Exchange.getBestAmountOut(
        USDC_ADDRESS,
        DAI_ADDRESS,
        amountIn
      )
      expect(bestAmountOut).gt(amountOutA)
      expect(bestAmountOut).closeTo(parseEther('997'), parseEther('1'))

      // when
      const {_amountOut, _path} = await swapper.getBestAmountOut(USDC_ADDRESS, DAI_ADDRESS, amountIn)

      // then
      expect(_amountOut).eq(bestAmountOut)
      expect(_path).deep.eq(bestPath)
    })

    it('should get best amountOut for WBTC->DAI', async function () {
      // given
      const amountIn = parseUnits('1', 8)
      const {_amountOut: amountOutA} = await uniswapV2Exchange.getBestAmountOut(WBTC_ADDRESS, DAI_ADDRESS, amountIn)
      const {_amountOut: bestAmountOut, _path: bestPath} = await sushiswapExchange.getBestAmountOut(
        WBTC_ADDRESS,
        DAI_ADDRESS,
        amountIn
      )
      expect(bestAmountOut).gt(amountOutA)
      expect(bestAmountOut).closeTo(parseEther('43,432'), parseEther('1'))

      // when
      const {_amountOut, _path} = await swapper.getBestAmountOut(WBTC_ADDRESS, DAI_ADDRESS, amountIn)

      // then
      expect(_amountOut).eq(bestAmountOut)
      expect(_path).deep.eq(bestPath)
    })
  })

  describe('swapExactInput', function () {
    it('should revert if slippage is too high', async function () {
      // given
      const amountIn = parseUnits('1', 8)
      const {_amountOut} = await swapper.getBestAmountOut(WBTC_ADDRESS, USDC_ADDRESS, amountIn)

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
      const {_amountOut} = await swapper.getBestAmountOut(WBTC_ADDRESS, USDC_ADDRESS, amountIn)
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
      const {_amountIn, _amountInMax} = await swapper.getBestAmountIn(USDC_ADDRESS, WBTC_ADDRESS, amountOut)
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
      const {_amountIn} = await swapper.getBestAmountIn(USDC_ADDRESS, WBTC_ADDRESS, amountOut)
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
      expect(usdcAfter).eq(usdcBefore.sub(_amountIn)) // no slippage scenario
      expect(wbtcAfter).eq(wbtcBefore.add(amountOut))
    })

    it('should return remaining if any', async function () {
      // given
      const amountOut = parseUnits('1', 8)
      const {_amountIn} = await swapper.getBestAmountIn(USDC_ADDRESS, WBTC_ADDRESS, amountOut)
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
      expect(usdcAfter).eq(usdcBefore.sub(_amountIn)) // no slippage scenario
      expect(wbtcAfter).eq(wbtcBefore.add(amountOut))
    })
  })
})
