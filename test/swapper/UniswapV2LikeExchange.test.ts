/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {UniswapV2LikeExchange, UniswapV2LikeExchange__factory, IERC20__factory, IERC20} from '../../typechain-types'
import {Addresses} from '../../helpers/address'
import {InitCodeHash} from '../../helpers/index'
import {parseEther, parseUnits} from '../helpers'
import {adjustBalance} from '../helpers/balance'

const abi = ethers.utils.defaultAbiCoder

describe('UniswapV2LikeExchange', function () {
  describe('UniswapV2LikeExchange @mainnet', function () {
    const {WETH, DAI, WBTC, STETH, USDC, UNISWAP_V2_FACTORY_ADDRESS} = Addresses.mainnet
    const UNISWAP_INIT_CODE_HASH = InitCodeHash[UNISWAP_V2_FACTORY_ADDRESS]

    let snapshotId: string
    let deployer: SignerWithAddress
    let dex: UniswapV2LikeExchange
    let weth: IERC20
    let dai: IERC20
    let wbtc: IERC20
    let usdc: IERC20
    let steth: IERC20

    beforeEach(async function () {
      snapshotId = await ethers.provider.send('evm_snapshot', [])
      ;[deployer] = await ethers.getSigners()

      const dexFactory = new UniswapV2LikeExchange__factory(deployer)
      dex = await dexFactory.deploy(UNISWAP_V2_FACTORY_ADDRESS, UNISWAP_INIT_CODE_HASH, WETH)
      await dex.deployed()

      weth = IERC20__factory.connect(WETH, deployer)
      dai = IERC20__factory.connect(DAI, deployer)
      wbtc = IERC20__factory.connect(WBTC, deployer)
      usdc = IERC20__factory.connect(USDC, deployer)
      steth = IERC20__factory.connect(STETH, deployer)

      await adjustBalance(weth.address, deployer.address, parseEther('1,000,000'))
      await adjustBalance(dai.address, deployer.address, parseEther('1,000,000'))
      await adjustBalance(wbtc.address, deployer.address, parseUnits('1,000,000', 8))
      await adjustBalance(usdc.address, deployer.address, parseUnits('1,000,000', 6))
      await adjustBalance(steth.address, deployer.address, parseEther('1,000'))
    })

    afterEach(async function () {
      await ethers.provider.send('evm_revert', [snapshotId])
    })

    describe('swapExactInput', function () {
      it('should swap WBTC->USDC', async function () {
        // given
        const amountIn = parseUnits('1', 8)
        const path = abi.encode(['address[]'], [[WBTC, USDC]])
        const amountOut = await dex.getAmountsOut(amountIn, path)
        const wbtcBefore = await wbtc.balanceOf(deployer.address)
        const usdcBefore = await usdc.balanceOf(deployer.address)

        // when
        await wbtc.transfer(dex.address, amountIn)
        await dex.swapExactInput(path, amountIn, 0, deployer.address)

        // then
        const wbtcAfter = await wbtc.balanceOf(deployer.address)
        const usdcAfter = await usdc.balanceOf(deployer.address)
        expect(wbtcAfter).eq(wbtcBefore.sub(amountIn))
        expect(usdcAfter).eq(usdcBefore.add(amountOut)) // no slippage scenario
      })

      it('should swap STETH->DAI', async function () {
        // stETH is rebase token so there are some special conditions in this test.
        // given trying to swap random amount of stETH
        const amountIn = '61361333631158094'
        const path = ethers.utils.defaultAbiCoder.encode(['address[]'], [[STETH, WETH, DAI]])
        const stethBefore = await steth.balanceOf(deployer.address)
        const daiBefore = await dai.balanceOf(deployer.address)

        // when
        await steth.transfer(dex.address, amountIn)
        // Check output of swap using callStatic
        const actualAmountOut = await dex.callStatic.swapExactInput(path, amountIn, '1', deployer.address)
        // Swap
        await dex.swapExactInput(path, amountIn, '1', deployer.address)

        // then
        const stethAfter = await steth.balanceOf(deployer.address)
        const daiAfter = await dai.balanceOf(deployer.address)
        // stETH will transfer 1 wei less, meaning there is 1 more wei after the swap
        expect(stethAfter).closeTo(stethBefore.sub(amountIn), '1')
        expect(daiAfter).eq(daiBefore.add(actualAmountOut))
      })
    })

    describe('swapExactOutput', function () {
      it('should swap USDC->WBTC', async function () {
        // given
        const amountOut = parseUnits('1', 8)
        const path = abi.encode(['address[]'], [[USDC, WETH, WBTC]])
        const amountIn = await dex.getAmountsIn(amountOut, path)
        const usdcBefore = await usdc.balanceOf(deployer.address)
        const wbtcBefore = await wbtc.balanceOf(deployer.address)

        // when
        await usdc.transfer(dex.address, amountIn)
        await dex.swapExactOutput(path, amountOut, amountIn, deployer.address, deployer.address)

        // then
        const usdcAfter = await usdc.balanceOf(deployer.address)
        const wbtcAfter = await wbtc.balanceOf(deployer.address)
        expect(usdcAfter).eq(usdcBefore.sub(amountIn)) // no slippage scenario
        expect(wbtcAfter).eq(wbtcBefore.add(amountOut))
      })

      // Previous exchange code will fail this test at block 15128100 with 'UniswapV2: K' error
      it('should swapExactOutput STETH->DAI', async function () {
        // given
        const amountOut = '63540089431808489926'
        const path = abi.encode(['address[]'], [[STETH, WETH, DAI]])
        const amountIn = await dex.getAmountsIn(amountOut, path)
        const stethBefore = await steth.balanceOf(deployer.address)
        const daiBefore = await dai.balanceOf(deployer.address)

        // when
        await steth.transfer(dex.address, amountIn)
        await dex.swapExactOutput(path, amountOut, amountIn, deployer.address, deployer.address)

        // then
        const stethAfter = await steth.balanceOf(deployer.address)
        const daiAfter = await dai.balanceOf(deployer.address)
        // stETH may transfer 1 wei less, meaning there may be 1 more wei after the swap
        expect(stethAfter).closeTo(stethBefore.sub(amountIn), '1')
        // Due to rebase/rounding, less stETH may be swapped so we may get less DAI than amount out
        expect(daiAfter).closeTo(daiBefore.add(amountOut), '5000')
      })

      it('should return remaining if any', async function () {
        // given
        const amountOut = parseUnits('1', 8)
        const path = abi.encode(['address[]'], [[USDC, WETH, WBTC]])
        const amountIn = await dex.getAmountsIn(amountOut, path)
        const usdcBefore = await usdc.balanceOf(deployer.address)
        const wbtcBefore = await wbtc.balanceOf(deployer.address)

        // when
        const amountInMax = amountIn.mul('2')
        await usdc.transfer(dex.address, amountInMax)
        await dex.swapExactOutput(path, amountOut, amountInMax, deployer.address, deployer.address)
        expect(await usdc.balanceOf(dex.address)).eq(0)

        // then
        const usdcAfter = await usdc.balanceOf(deployer.address)
        const wbtcAfter = await wbtc.balanceOf(deployer.address)
        expect(usdcAfter).eq(usdcBefore.sub(amountIn)) // no slippage scenario
        expect(wbtcAfter).eq(wbtcBefore.add(amountOut))
      })
    })
  })

  describe('UniswapV2LikeExchange @avalanche', function () {
    const {WAVAX, DAI, WBTC, USDC, PANGOLIN_FACTORY_ADDRESS} = Addresses.avalanche
    const PANGOLIN_INIT_CODE_HASH = InitCodeHash[PANGOLIN_FACTORY_ADDRESS]
    let snapshotId: string
    let deployer: SignerWithAddress
    let dex: UniswapV2LikeExchange
    let wavax: IERC20
    let dai: IERC20
    let wbtc: IERC20
    let usdc: IERC20

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

      const dexFactory = new UniswapV2LikeExchange__factory(deployer)
      dex = await dexFactory.deploy(PANGOLIN_FACTORY_ADDRESS, PANGOLIN_INIT_CODE_HASH, WAVAX)
      await dex.deployed()

      wavax = IERC20__factory.connect(WAVAX, deployer)
      dai = IERC20__factory.connect(DAI, deployer)
      wbtc = IERC20__factory.connect(WBTC, deployer)
      usdc = IERC20__factory.connect(USDC, deployer)

      await adjustBalance(wavax.address, deployer.address, parseEther('1,000,000'))
      await adjustBalance(dai.address, deployer.address, parseEther('1,000,000'))
      await adjustBalance(wbtc.address, deployer.address, parseUnits('1,000,000', 8))
      await adjustBalance(usdc.address, deployer.address, parseUnits('1,000,000', 6))
      // Take snapshot of setup
      snapshotId = await ethers.provider.send('evm_snapshot', [])
    })

    afterEach(async function () {
      // Revert to snapshot point
      await ethers.provider.send('evm_revert', [snapshotId])
    })

    describe('swapExactInput', function () {
      it('should swap WAVAX->DAI', async function () {
        // given
        const amountIn = parseEther('1')
        const path = abi.encode(['address[]'], [[WAVAX, DAI]])
        const amountOut = await dex.getAmountsOut(amountIn, path)
        const wavaxBefore = await wavax.balanceOf(deployer.address)
        const daiBefore = await dai.balanceOf(deployer.address)

        // when
        await wavax.transfer(dex.address, amountIn)
        await dex.swapExactInput(path, amountIn, 0, deployer.address)

        // then
        const wavaxAfter = await wavax.balanceOf(deployer.address)
        const daiAfter = await dai.balanceOf(deployer.address)
        expect(wavaxAfter).eq(wavaxBefore.sub(amountIn))
        expect(daiAfter).eq(daiBefore.add(amountOut)) // no slippage scenario
      })

      it('should swap WBTC->USDC', async function () {
        // given
        const amountIn = parseUnits('1', 8)
        const path = abi.encode(['address[]'], [[WBTC, WAVAX, USDC]])
        const amountOut = await dex.getAmountsOut(amountIn, path)
        const wbtcBefore = await wbtc.balanceOf(deployer.address)
        const usdcBefore = await usdc.balanceOf(deployer.address)

        // when
        await wbtc.transfer(dex.address, amountIn)
        await dex.swapExactInput(path, amountIn, 0, deployer.address)

        // then
        const wbtcAfter = await wbtc.balanceOf(deployer.address)
        const usdcAfter = await usdc.balanceOf(deployer.address)
        expect(wbtcAfter).eq(wbtcBefore.sub(amountIn))
        expect(usdcAfter).eq(usdcBefore.add(amountOut)) // no slippage scenario
      })
    })

    describe('swapExactOutput', function () {
      it('should swap DAI->WAVAX', async function () {
        // given
        const amountOut = parseEther('1')
        const path = abi.encode(['address[]'], [[DAI, WAVAX]])
        const amountIn = await dex.getAmountsIn(amountOut, path)
        const daiBefore = await dai.balanceOf(deployer.address)
        const wavaxBefore = await wavax.balanceOf(deployer.address)

        // when
        await dai.transfer(dex.address, amountIn)
        await dex.swapExactOutput(path, amountOut, amountIn, deployer.address, deployer.address)

        // then
        const daiAfter = await dai.balanceOf(deployer.address)
        const wavaxAfter = await wavax.balanceOf(deployer.address)
        expect(daiAfter).eq(daiBefore.sub(amountIn)) // no slippage scenario
        expect(wavaxAfter).eq(wavaxBefore.add(amountOut))
      })

      it('should swap USDC->WBTC', async function () {
        // given
        const amountOut = parseUnits('1', 8)
        const path = abi.encode(['address[]'], [[USDC, WAVAX, WBTC]])
        const amountIn = await dex.getAmountsIn(amountOut, path)
        const usdcBefore = await usdc.balanceOf(deployer.address)
        const wbtcBefore = await wbtc.balanceOf(deployer.address)

        // when
        await usdc.transfer(dex.address, amountIn)
        await dex.swapExactOutput(path, amountOut, amountIn, deployer.address, deployer.address)

        // then
        const usdcAfter = await usdc.balanceOf(deployer.address)
        const wbtcAfter = await wbtc.balanceOf(deployer.address)
        expect(usdcAfter).eq(usdcBefore.sub(amountIn)) // no slippage scenario
        expect(wbtcAfter).eq(wbtcBefore.add(amountOut))
      })

      it('should return remaining if any', async function () {
        // given
        const amountOut = parseUnits('1', 8)
        const path = abi.encode(['address[]'], [[USDC, WAVAX, WBTC]])
        const amountIn = await dex.getAmountsIn(amountOut, path)
        const usdcBefore = await usdc.balanceOf(deployer.address)
        const wbtcBefore = await wbtc.balanceOf(deployer.address)

        // when
        const amountInMax = amountIn.mul('2')
        await usdc.transfer(dex.address, amountInMax)
        await dex.swapExactOutput(path, amountOut, amountInMax, deployer.address, deployer.address)
        expect(await usdc.balanceOf(dex.address)).eq(0)

        // then
        const usdcAfter = await usdc.balanceOf(deployer.address)
        const wbtcAfter = await wbtc.balanceOf(deployer.address)
        expect(usdcAfter).eq(usdcBefore.sub(amountIn)) // no slippage scenario
        expect(wbtcAfter).eq(wbtcBefore.add(amountOut))
      })
    })
  })
})
