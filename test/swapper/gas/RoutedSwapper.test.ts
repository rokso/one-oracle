/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {
  UniswapV2LikeExchange,
  UniswapV3Exchange,
  RoutedSwapper,
  RoutedSwapper__factory,
  IERC20,
  IERC20__factory,
  UniswapV2LikeExchange__factory,
  UniswapV3Exchange__factory,
} from '../../../typechain-types'
import {Address, ExchangeType, SwapType} from '../../../helpers'
import {parseEther, parseUnits} from '../../helpers'
import {adjustBalance} from '../../helpers/balance'

const {
  WETH_ADDRESS,
  DAI_ADDRESS,
  WBTC_ADDRESS,
  USDC_ADDRESS,
  NOT_ON_CHAINLINK_TOKEN: BTT_ADDRESS,
  UNISWAP_V2_FACTORY_ADDRESS,
} = Address.mainnet

describe('GasUsage:RoutedSwapper @mainnet', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let uniswapV2Exchange: UniswapV2LikeExchange
  let uniswapV3Exchange: UniswapV3Exchange
  let uniswapV3DefaultPoolFee: number
  let swapper: RoutedSwapper
  let weth: IERC20
  let dai: IERC20
  let wbtc: IERC20
  let usdc: IERC20
  let btt: IERC20

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
    await adjustBalance(btt.address, deployer.address, parseEther('1,000,000,000,000'))

    const uniswapV2LikeExchangeFactory = new UniswapV2LikeExchange__factory(deployer)

    uniswapV2Exchange = await uniswapV2LikeExchangeFactory.deploy(UNISWAP_V2_FACTORY_ADDRESS, WETH_ADDRESS)
    await uniswapV2Exchange.deployed()

    const uniswapV3ExchangeFactory = new UniswapV3Exchange__factory(deployer)
    uniswapV3Exchange = await uniswapV3ExchangeFactory.deploy(WETH_ADDRESS)
    await uniswapV3Exchange.deployed()
    uniswapV3DefaultPoolFee = await uniswapV3Exchange.defaultPoolFee()

    //
    // Swapper Setup
    //
    const swapperFactory = new RoutedSwapper__factory(deployer)
    swapper = await swapperFactory.deploy()
    await swapper.deployed()

    await swapper.setExchange(ExchangeType.UNISWAP_V2, uniswapV2Exchange.address)
    await swapper.setExchange(ExchangeType.UNISWAP_V3, uniswapV3Exchange.address)
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('worst case: 3 length path', function () {
    describe('with default routing', function () {
      beforeEach(async function () {
        const defaultPath = ethers.utils.solidityPack(
          ['address', 'uint24', 'address', 'uint24', 'address'],
          [WBTC_ADDRESS, uniswapV3DefaultPoolFee, WETH_ADDRESS, uniswapV3DefaultPoolFee, BTT_ADDRESS]
        )

        await swapper.setDefaultRouting(
          SwapType.EXACT_INPUT,
          WBTC_ADDRESS,
          BTT_ADDRESS,
          ExchangeType.UNISWAP_V3,
          defaultPath
        )

        await swapper.setDefaultRouting(
          SwapType.EXACT_OUTPUT,
          BTT_ADDRESS,
          WBTC_ADDRESS,
          ExchangeType.UNISWAP_V3,
          defaultPath
        )
      })

      it('getBestAmountOut', async function () {
        const amountIn = parseUnits('0.001', 8)
        const tx = await swapper.getAmountOut(WBTC_ADDRESS, BTT_ADDRESS, amountIn)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).eq('191950')
      })

      it('swapExactInput', async function () {
        // given
        const amountIn = parseUnits('0.001', 8)

        // when
        await wbtc.approve(swapper.address, amountIn)
        const tx1 = await swapper.swapExactInput(WBTC_ADDRESS, BTT_ADDRESS, amountIn, 0, deployer.address)
        await wbtc.approve(swapper.address, amountIn)
        const tx2 = await swapper.swapExactInput(WBTC_ADDRESS, BTT_ADDRESS, amountIn, 0, deployer.address)

        // then
        expect([(await tx1.wait()).gasUsed.toNumber(), (await tx2.wait()).gasUsed.toNumber()]).deep.eq([238264, 217859])
      })

      it('getBestAmountIn', async function () {
        const amountOut = parseUnits('0.001', 8)
        const tx = await swapper.getAmountIn(BTT_ADDRESS, WBTC_ADDRESS, amountOut)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).eq('197808')
      })

      it('swapExactOutput', async function () {
        // given
        const amountOut = parseUnits('0.001', 8)
        const amountIn = await swapper.callStatic.getAmountIn(BTT_ADDRESS, WBTC_ADDRESS, amountOut)
        const amountInMax = amountIn.mul('2')

        // when
        await btt.approve(swapper.address, amountInMax)
        const tx1 = await swapper.swapExactOutput(BTT_ADDRESS, WBTC_ADDRESS, amountOut, amountInMax, deployer.address)
        await btt.approve(swapper.address, amountInMax)
        const tx2 = await swapper.swapExactOutput(BTT_ADDRESS, WBTC_ADDRESS, amountOut, amountInMax, deployer.address)

        // then
        expect([(await tx1.wait()).gasUsed.toNumber(), (await tx2.wait()).gasUsed.toNumber()]).deep.eq([241423, 221114])
      })
    })
  })

  describe('best case: 2 length path', function () {
    const abi = ethers.utils.defaultAbiCoder
    const wbtc2wethPath = abi.encode(['address[]'], [[WBTC_ADDRESS, WETH_ADDRESS]])
    const weth2btcPath = abi.encode(['address[]'], [[WETH_ADDRESS, WBTC_ADDRESS]])

    beforeEach(async function () {
      await swapper.setDefaultRouting(
        SwapType.EXACT_INPUT,
        WBTC_ADDRESS,
        WETH_ADDRESS,
        ExchangeType.UNISWAP_V2,
        wbtc2wethPath
      )
      await swapper.setDefaultRouting(
        SwapType.EXACT_OUTPUT,
        WETH_ADDRESS,
        WBTC_ADDRESS,
        ExchangeType.UNISWAP_V2,
        weth2btcPath
      )
    })

    it('getBestAmountOut', async function () {
      const amountIn = parseUnits('0.001', 8)
      const tx = await swapper.getAmountOut(WBTC_ADDRESS, WETH_ADDRESS, amountIn)
      const receipt = await tx.wait()
      expect(receipt.gasUsed).eq('61832')
    })

    it('swapExactInput', async function () {
      // given
      const amountIn = parseUnits('0.001', 8)

      // when
      await wbtc.approve(swapper.address, amountIn)
      const tx1 = await swapper.swapExactInput(WBTC_ADDRESS, WETH_ADDRESS, amountIn, 0, deployer.address)
      await wbtc.approve(swapper.address, amountIn)
      const tx2 = await swapper.swapExactInput(WBTC_ADDRESS, WETH_ADDRESS, amountIn, 0, deployer.address)

      // then
      expect([(await tx1.wait()).gasUsed.toNumber(), (await tx2.wait()).gasUsed.toNumber()]).deep.eq([171220, 150851])
    })

    it('getBestAmountIn', async function () {
      const amountOut = parseUnits('0.001', 8)
      const tx = await swapper.getAmountIn(WETH_ADDRESS, WBTC_ADDRESS, amountOut)
      const receipt = await tx.wait()
      expect(receipt.gasUsed).eq('61795')
    })

    it('swapExactOutput', async function () {
      // given
      const amountOut = parseUnits('0.001', 8)
      const amountIn = await swapper.callStatic.getAmountIn(WETH_ADDRESS, WBTC_ADDRESS, amountOut)
      const amountInMax = amountIn.mul('2')
      await weth.approve(swapper.address, amountInMax)
      const tx1 = await swapper.swapExactOutput(WETH_ADDRESS, WBTC_ADDRESS, amountOut, amountInMax, deployer.address)

      // when
      await weth.approve(swapper.address, amountInMax)
      const tx2 = await swapper.swapExactOutput(WETH_ADDRESS, WBTC_ADDRESS, amountOut, amountInMax, deployer.address)

      // then
      expect([(await tx1.wait()).gasUsed.toNumber(), (await tx2.wait()).gasUsed.toNumber()]).deep.eq([174491, 151627])
    })
  })
})
