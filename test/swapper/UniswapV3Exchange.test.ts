/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {IERC20, IERC20__factory, UniswapV3Exchange, UniswapV3Exchange__factory} from '../../typechain-types'
import Address from '../../helpers/address'
import {parseEther, min, max, parseUnits} from '../helpers'
import {adjustBalance} from '../helpers/balance'

const {WETH_ADDRESS, DAI_ADDRESS, WBTC_ADDRESS, USDC_ADDRESS} = Address.mainnet

describe('UniswapV3Exchange @mainnet', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let invalidToken: SignerWithAddress
  let dex: UniswapV3Exchange
  let weth: IERC20
  let dai: IERC20
  let wbtc: IERC20
  let usdc: IERC20

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer, invalidToken] = await ethers.getSigners()

    const dexFactory = new UniswapV3Exchange__factory(deployer)
    dex = await dexFactory.deploy(WETH_ADDRESS)
    await dex.deployed()

    weth = IERC20__factory.connect(WETH_ADDRESS, deployer)
    dai = IERC20__factory.connect(DAI_ADDRESS, deployer)
    wbtc = IERC20__factory.connect(WBTC_ADDRESS, deployer)
    usdc = IERC20__factory.connect(USDC_ADDRESS, deployer)

    await adjustBalance(weth.address, deployer.address, parseEther('1,000,000'))
    await adjustBalance(dai.address, deployer.address, parseEther('1,000,000'))
    await adjustBalance(wbtc.address, deployer.address, parseUnits('1,000,000', 8))
    await adjustBalance(usdc.address, deployer.address, parseUnits('1,000,000', 6))
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('getBestAmountIn', function () {
    it('should revert if swap is impossible', async function () {
      const amountOut = parseEther('1,000')
      const call0 = dex.getBestAmountIn(WETH_ADDRESS, invalidToken.address, amountOut)
      const call1 = dex.getBestAmountIn(DAI_ADDRESS, invalidToken.address, amountOut)
      await expect(call0).revertedWith('invalid-swap')
      await expect(call1).revertedWith('invalid-swap')
    })

    it('should get best amountIn for WETH->DAI', async function () {
      // given
      const amountOut = parseEther('3,222')
      const bestAmountIn = await dex.getAmountsIn(amountOut, [WETH_ADDRESS, DAI_ADDRESS])
      expect(bestAmountIn).closeTo(parseEther('1'), parseEther('0.1'))

      // when
      const {_amountIn} = await dex.getBestAmountIn(WETH_ADDRESS, DAI_ADDRESS, amountOut)

      // then
      expect(_amountIn).eq(bestAmountIn)
    })

    it('should get best amountIn for USDC->DAI', async function () {
      // given
      const amountOut = parseEther('100')
      const bestAmountIn = await dex.getAmountsIn(amountOut, [USDC_ADDRESS, WETH_ADDRESS, DAI_ADDRESS])
      expect(bestAmountIn).closeTo(parseUnits('100', 6), parseUnits('1', 6))

      // when
      const {_amountIn} = await dex.getBestAmountIn(USDC_ADDRESS, DAI_ADDRESS, amountOut)

      // then
      expect(_amountIn).eq(bestAmountIn)
    })

    it('should get best amountIn for WBTC->DAI', async function () {
      // given
      const amountOut = parseEther('43,221')
      const amountInA = await dex.getAmountsIn(amountOut, [WBTC_ADDRESS, DAI_ADDRESS])
      const amountInB = await dex.getAmountsIn(amountOut, [WBTC_ADDRESS, WETH_ADDRESS, DAI_ADDRESS])
      const bestAmountIn = min(amountInA, amountInB)
      expect(bestAmountIn).closeTo(parseUnits('1', 8), parseUnits('0.1', 8))

      // when
      const {_amountIn} = await dex.getBestAmountIn(WBTC_ADDRESS, DAI_ADDRESS, amountOut)

      // then
      expect(_amountIn).eq(bestAmountIn)
    })
  })

  describe('getBestAmountOut', function () {
    it('should revert if swap is impossible', async function () {
      const amountIn = parseEther('1,000')
      const call0 = dex.getBestAmountOut(WETH_ADDRESS, invalidToken.address, amountIn)
      const call1 = dex.getBestAmountOut(DAI_ADDRESS, invalidToken.address, amountIn)
      await expect(call0).revertedWith('invalid-swap')
      await expect(call1).revertedWith('invalid-swap')
    })

    it('should get best amountOut for WETH->DAI', async function () {
      // given
      const amountIn = parseEther('1')
      const bestAmountOut = await dex.getAmountsOut(amountIn, [WETH_ADDRESS, DAI_ADDRESS])
      expect(bestAmountOut).closeTo(parseEther('3,227'), parseEther('1'))

      // when
      const {_amountOut} = await dex.getBestAmountOut(WETH_ADDRESS, DAI_ADDRESS, amountIn)

      // then
      expect(_amountOut).eq(bestAmountOut)
    })

    it('should get best amountOut for USDC->DAI', async function () {
      // given
      const amountIn = parseUnits('1,000', 6)
      const bestAmountOut = await dex.getAmountsOut(amountIn, [USDC_ADDRESS, WETH_ADDRESS, DAI_ADDRESS])
      expect(bestAmountOut).closeTo(parseEther('1000'), parseEther('6'))

      // when
      const {_amountOut} = await dex.getBestAmountOut(USDC_ADDRESS, DAI_ADDRESS, amountIn)

      // then
      expect(_amountOut).eq(bestAmountOut)
    })

    it('should get best amountOut for WBTC->DAI', async function () {
      // given
      const amountIn = parseUnits('1', 8)
      const amountOutA = await dex.getAmountsOut(amountIn, [WBTC_ADDRESS, DAI_ADDRESS])
      const amountOutB = await dex.getAmountsOut(amountIn, [WBTC_ADDRESS, WETH_ADDRESS, DAI_ADDRESS])
      const bestAmountOut = max(amountOutA, amountOutB)
      expect(bestAmountOut).closeTo(parseEther('43,521'), parseEther('1'))

      // when
      const {_amountOut} = await dex.getBestAmountOut(WBTC_ADDRESS, DAI_ADDRESS, amountIn)

      // then
      expect(_amountOut).eq(bestAmountOut)
    })
  })

  describe('swapExactInput', function () {
    it('should swap WETH->DAI', async function () {
      // given
      const amountIn = parseEther('1')
      const {_amountOut, _path} = await dex.getBestAmountOut(WETH_ADDRESS, DAI_ADDRESS, amountIn)
      expect(_path).deep.eq([WETH_ADDRESS, DAI_ADDRESS])
      const wethBefore = await weth.balanceOf(deployer.address)
      const daiBefore = await dai.balanceOf(deployer.address)

      // when
      await weth.transfer(dex.address, amountIn)
      await dex.swapExactInput(_path, amountIn, 0, deployer.address)

      // then
      const wethAfter = await weth.balanceOf(deployer.address)
      const daiAfter = await dai.balanceOf(deployer.address)

      const actual = daiAfter.sub(daiBefore)

      expect(wethAfter).eq(wethBefore.sub(amountIn))
      expect(actual).closeTo(_amountOut, parseEther('0.1'))
    })

    it('should swap WBTC->WETH->DAI', async function () {
      // given
      const amountIn = parseUnits('1', 8)
      const {_amountOut, _path} = await dex.getBestAmountOut(WBTC_ADDRESS, DAI_ADDRESS, amountIn)
      expect(_path).deep.eq([WBTC_ADDRESS, WETH_ADDRESS, DAI_ADDRESS])
      const wbtcBefore = await wbtc.balanceOf(deployer.address)
      const daiBefore = await dai.balanceOf(deployer.address)

      // when
      await wbtc.transfer(dex.address, amountIn)
      await dex.swapExactInput(_path, amountIn, 0, deployer.address)

      // then
      const wbtcAfter = await wbtc.balanceOf(deployer.address)
      const daiAfter = await dai.balanceOf(deployer.address)

      const actual = daiAfter.sub(daiBefore)

      expect(wbtcAfter).eq(wbtcBefore.sub(amountIn))
      expect(actual).closeTo(_amountOut, parseEther('10'))
    })
  })

  describe('swapExactOutput', function () {
    it('should swap DAI->WETH', async function () {
      // given
      const amountOut = parseEther('1')
      const {_amountIn, _path} = await dex.getBestAmountIn(DAI_ADDRESS, WETH_ADDRESS, amountOut)
      const daiBefore = await dai.balanceOf(deployer.address)
      const wethBefore = await weth.balanceOf(deployer.address)

      // when
      const amountInMax = _amountIn.mul(parseEther('1.1')).div(parseEther('1'))
      await dai.transfer(dex.address, amountInMax)
      await dex.swapExactOutput(_path, amountOut, amountInMax, deployer.address, deployer.address)

      // then
      const daiAfter = await dai.balanceOf(deployer.address)
      const wethAfter = await weth.balanceOf(deployer.address)
      const actual = daiBefore.sub(daiAfter)

      expect(actual).closeTo(_amountIn, parseEther('10'))
      expect(wethAfter).eq(wethBefore.add(amountOut))
    })

    it('should swap DAI->WETH->WBTC', async function () {
      // given
      const amountOut = parseUnits('0.1', 8)
      const {_amountIn, _path} = await dex.getBestAmountIn(DAI_ADDRESS, WBTC_ADDRESS, amountOut)

      const daiBefore = await dai.balanceOf(deployer.address)
      const wbtcBefore = await wbtc.balanceOf(deployer.address)

      // when
      const amountInMax = _amountIn.mul(parseEther('1.1')).div(parseEther('1'))
      await dai.transfer(dex.address, amountInMax)
      await dex.swapExactOutput(_path, amountOut, amountInMax, deployer.address, deployer.address)

      // then
      const daiAfter = await dai.balanceOf(deployer.address)
      const wbtcAfter = await wbtc.balanceOf(deployer.address)
      const actual = daiBefore.sub(daiAfter)

      expect(actual).closeTo(_amountIn, parseEther('10'))
      expect(wbtcAfter).eq(wbtcBefore.add(amountOut))
    })

    it('DAI->WETH->BTC', async function () {
      // given
      const amountOut = parseUnits('0.1', 8)
      const _path = [DAI_ADDRESS, WETH_ADDRESS, WBTC_ADDRESS]
      const _amountIn = await dex.getAmountsIn(amountOut, _path)

      const daiBefore = await dai.balanceOf(deployer.address)
      const wbtcBefore = await wbtc.balanceOf(deployer.address)

      // when
      const amountInMax = _amountIn.mul(parseEther('1.1')).div(parseEther('1'))
      await dai.transfer(dex.address, amountInMax)
      await dex.swapExactOutput(_path, amountOut, amountInMax, deployer.address, deployer.address)

      // then
      const daiAfter = await dai.balanceOf(deployer.address)
      const wbtcAfter = await wbtc.balanceOf(deployer.address)
      const actual = daiBefore.sub(daiAfter)

      expect(actual).closeTo(_amountIn, parseEther('10'))
      expect(wbtcAfter).eq(wbtcBefore.add(amountOut))
    })
  })
})
