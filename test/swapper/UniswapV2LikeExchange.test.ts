/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {
  UniswapV2LikeExchange,
  UniswapV2LikeExchange__factory,
  IUniswapV2Router02,
  IUniswapV2Router02__factory,
  IERC20__factory,
  IERC20,
} from '../../typechain-types'
import Address from '../../helpers/address'
import {InitCodeHash} from '../../helpers/index'
import {parseEther, min, max, parseUnits} from '../helpers'
import {adjustBalance} from '../helpers/balance'

const abi = ethers.utils.defaultAbiCoder

describe('UniswapV2LikeExchange', function () {
  describe('UniswapV2LikeExchange @mainnet', function () {
    const {
      WETH_ADDRESS,
      DAI_ADDRESS,
      WBTC_ADDRESS,
      STETH_ADDRESS,
      USDC_ADDRESS,
      UNISWAP_V2_ROUTER_ADDRESS,
      UNISWAP_V2_FACTORY_ADDRESS,
    } = Address.mainnet
    const UNISWAP_INIT_CODE_HASH = InitCodeHash[UNISWAP_V2_FACTORY_ADDRESS]

    let snapshotId: string
    let deployer: SignerWithAddress
    let invalidToken: SignerWithAddress
    let dex: UniswapV2LikeExchange
    let router: IUniswapV2Router02
    let weth: IERC20
    let dai: IERC20
    let wbtc: IERC20
    let usdc: IERC20
    let steth: IERC20

    beforeEach(async function () {
      snapshotId = await ethers.provider.send('evm_snapshot', [])
      ;[deployer, invalidToken] = await ethers.getSigners()

      router = IUniswapV2Router02__factory.connect(UNISWAP_V2_ROUTER_ADDRESS, deployer)

      const dexFactory = new UniswapV2LikeExchange__factory(deployer)
      dex = await dexFactory.deploy(UNISWAP_V2_FACTORY_ADDRESS, UNISWAP_INIT_CODE_HASH, WETH_ADDRESS)
      await dex.deployed()

      weth = IERC20__factory.connect(WETH_ADDRESS, deployer)
      dai = IERC20__factory.connect(DAI_ADDRESS, deployer)
      wbtc = IERC20__factory.connect(WBTC_ADDRESS, deployer)
      usdc = IERC20__factory.connect(USDC_ADDRESS, deployer)
      steth = IERC20__factory.connect(STETH_ADDRESS, deployer)

      await adjustBalance(weth.address, deployer.address, parseEther('1,000,000'))
      await adjustBalance(dai.address, deployer.address, parseEther('1,000,000'))
      await adjustBalance(wbtc.address, deployer.address, parseUnits('1,000,000', 8))
      await adjustBalance(usdc.address, deployer.address, parseUnits('1,000,000', 6))
      await adjustBalance(steth.address, deployer.address, parseEther('1,000'))
    })

    afterEach(async function () {
      await ethers.provider.send('evm_revert', [snapshotId])
    })

    describe('getBestAmountIn', function () {
      it('should revert if swap is impossible', async function () {
        const amountOut = parseEther('1,000')
        const call0 = dex.getBestAmountIn(WETH_ADDRESS, invalidToken.address, amountOut)
        const call1 = dex.getBestAmountIn(DAI_ADDRESS, invalidToken.address, amountOut)
        await expect(call0).revertedWith('no-path-found')
        await expect(call1).revertedWith('no-path-found')
      })

      it('should get best amountIn for USDC->DAI', async function () {
        // given
        const amountOut = parseEther('997')
        const [amountInA] = await router.getAmountsIn(amountOut, [USDC_ADDRESS, DAI_ADDRESS])
        const [amountInB] = await router.getAmountsIn(amountOut, [USDC_ADDRESS, WETH_ADDRESS, DAI_ADDRESS])
        const bestAmountIn = min(amountInA, amountInB)
        expect(bestAmountIn).closeTo(parseUnits('1,000', 6), parseUnits('1', 6))

        // when
        const {_amountIn} = await dex.callStatic.getBestAmountIn(USDC_ADDRESS, DAI_ADDRESS, amountOut)

        // then
        expect(_amountIn).eq(bestAmountIn)
      })

      it('should get best amountIn for WBTC->DAI', async function () {
        // given
        const amountOut = parseEther('43,221')
        const [amountInA] = await router.getAmountsIn(amountOut, [WBTC_ADDRESS, DAI_ADDRESS])
        const [amountInB] = await router.getAmountsIn(amountOut, [WBTC_ADDRESS, WETH_ADDRESS, DAI_ADDRESS])
        const bestAmountIn = min(amountInA, amountInB)
        expect(bestAmountIn).closeTo(parseUnits('1', 8), parseUnits('0.1', 8))

        // when
        const {_amountIn} = await dex.callStatic.getBestAmountIn(WBTC_ADDRESS, DAI_ADDRESS, amountOut)

        // then
        expect(_amountIn).eq(bestAmountIn)
      })
    })

    describe('getBestAmountOut', function () {
      it('should revert if swap is impossible', async function () {
        const amountIn = parseEther('1,000')
        const call0 = dex.getBestAmountOut(WETH_ADDRESS, invalidToken.address, amountIn)
        const call1 = dex.getBestAmountOut(DAI_ADDRESS, invalidToken.address, amountIn)
        await expect(call0).revertedWith('no-path-found')
        await expect(call1).revertedWith('no-path-found')
      })

      it('should get best amountOut for USDC->DAI', async function () {
        // given
        const amountIn = parseUnits('1,000', 6)
        const [, amountOutA] = await router.getAmountsOut(amountIn, [USDC_ADDRESS, DAI_ADDRESS])
        const [, , amountOutB] = await router.getAmountsOut(amountIn, [USDC_ADDRESS, WETH_ADDRESS, DAI_ADDRESS])
        const bestAmountOut = max(amountOutA, amountOutB)
        expect(bestAmountOut).closeTo(parseEther('997'), parseEther('1'))

        // when
        const {_amountOut} = await dex.callStatic.getBestAmountOut(USDC_ADDRESS, DAI_ADDRESS, amountIn)

        // then
        expect(_amountOut).eq(bestAmountOut)
      })

      it('should get best amountOut for WBTC->DAI', async function () {
        // given
        const amountIn = parseUnits('1', 8)
        const [, amountOutA] = await router.getAmountsOut(amountIn, [WBTC_ADDRESS, DAI_ADDRESS])
        const [, , amountOutB] = await router.getAmountsOut(amountIn, [WBTC_ADDRESS, WETH_ADDRESS, DAI_ADDRESS])
        const bestAmountOut = max(amountOutA, amountOutB)
        expect(bestAmountOut).closeTo(parseEther('43,221'), parseEther('1'))

        // when
        const {_amountOut} = await dex.callStatic.getBestAmountOut(WBTC_ADDRESS, DAI_ADDRESS, amountIn)

        // then
        expect(_amountOut).eq(bestAmountOut)
      })
    })

    describe('swapExactInput', function () {
      it('should swap WBTC->USDC', async function () {
        // given
        const amountIn = parseUnits('1', 8)
        const {_amountOut, _path} = await dex.callStatic.getBestAmountOut(WBTC_ADDRESS, USDC_ADDRESS, amountIn)
        const wbtcBefore = await wbtc.balanceOf(deployer.address)
        const usdcBefore = await usdc.balanceOf(deployer.address)

        // when
        await wbtc.transfer(dex.address, amountIn)
        await dex.swapExactInput(_path, amountIn, 0, deployer.address)

        // then
        const wbtcAfter = await wbtc.balanceOf(deployer.address)
        const usdcAfter = await usdc.balanceOf(deployer.address)
        expect(wbtcAfter).eq(wbtcBefore.sub(amountIn))
        expect(usdcAfter).eq(usdcBefore.add(_amountOut)) // no slippage scenario
      })

      it('should swap STETH->DAI', async function () {
        // stETH is rebase token so there are some special conditions in this test.
        // given trying to swap random amount of stETH
        const amountIn = '61361333631158094'
        const path = ethers.utils.defaultAbiCoder.encode(['address[]'], [[STETH_ADDRESS, WETH_ADDRESS, DAI_ADDRESS]])
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
        const {_amountIn, _path} = await dex.callStatic.getBestAmountIn(USDC_ADDRESS, WBTC_ADDRESS, amountOut)
        const usdcBefore = await usdc.balanceOf(deployer.address)
        const wbtcBefore = await wbtc.balanceOf(deployer.address)

        // when
        await usdc.transfer(dex.address, _amountIn)
        await dex.swapExactOutput(_path, amountOut, _amountIn, deployer.address, deployer.address)

        // then
        const usdcAfter = await usdc.balanceOf(deployer.address)
        const wbtcAfter = await wbtc.balanceOf(deployer.address)
        expect(usdcAfter).eq(usdcBefore.sub(_amountIn)) // no slippage scenario
        expect(wbtcAfter).eq(wbtcBefore.add(amountOut))
      })

      // Previous exchange code will fail this test at block 15128100 with 'UniswapV2: K' error
      it('should swapExactOutput STETH->DAI', async function () {
        // given
        const amountOut = '63540089431808489926'
        const {_amountIn, _path} = await dex.callStatic.getBestAmountIn(STETH_ADDRESS, DAI_ADDRESS, amountOut)
        const stethBefore = await steth.balanceOf(deployer.address)
        const daiBefore = await dai.balanceOf(deployer.address)

        // when
        await steth.transfer(dex.address, _amountIn)
        await dex.swapExactOutput(_path, amountOut, _amountIn, deployer.address, deployer.address)

        // then
        const stethAfter = await steth.balanceOf(deployer.address)
        const daiAfter = await dai.balanceOf(deployer.address)
        // stETH may transfer 1 wei less, meaning there may be 1 more wei after the swap
        expect(stethAfter).closeTo(stethBefore.sub(_amountIn), '1')
        // Due to rebase/rounding, less stETH may be swapped so we may get less DAI than amount out
        expect(daiAfter).closeTo(daiBefore.add(amountOut), '5000')
      })

      it('should return remaining if any', async function () {
        // given
        const amountOut = parseUnits('1', 8)
        const {_amountIn, _path} = await dex.callStatic.getBestAmountIn(USDC_ADDRESS, WBTC_ADDRESS, amountOut)
        const usdcBefore = await usdc.balanceOf(deployer.address)
        const wbtcBefore = await wbtc.balanceOf(deployer.address)

        // when
        const amountInMax = _amountIn.mul('2')
        await usdc.transfer(dex.address, amountInMax)
        await dex.swapExactOutput(_path, amountOut, amountInMax, deployer.address, deployer.address)
        expect(await usdc.balanceOf(dex.address)).eq(0)

        // then
        const usdcAfter = await usdc.balanceOf(deployer.address)
        const wbtcAfter = await wbtc.balanceOf(deployer.address)
        expect(usdcAfter).eq(usdcBefore.sub(_amountIn)) // no slippage scenario
        expect(wbtcAfter).eq(wbtcBefore.add(amountOut))
      })
    })
  })

  describe('UniswapV2LikeExchange @avalanche', function () {
    const {WAVAX_ADDRESS, DAI_ADDRESS, WBTC_ADDRESS, USDC_ADDRESS, PANGOLIN_ROUTER_ADDRESS, PANGOLIN_FACTORY_ADDRESS} =
      Address.avalanche
    const PANGOLIN_INIT_CODE_HASH = InitCodeHash[PANGOLIN_FACTORY_ADDRESS]
    let snapshotId: string
    let deployer: SignerWithAddress
    let invalidToken: SignerWithAddress
    let dex: UniswapV2LikeExchange
    let router: IUniswapV2Router02
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
      ;[deployer, invalidToken] = await ethers.getSigners()

      router = IUniswapV2Router02__factory.connect(PANGOLIN_ROUTER_ADDRESS, deployer)

      const dexFactory = new UniswapV2LikeExchange__factory(deployer)
      dex = await dexFactory.deploy(PANGOLIN_FACTORY_ADDRESS, PANGOLIN_INIT_CODE_HASH, WAVAX_ADDRESS)
      await dex.deployed()

      wavax = IERC20__factory.connect(WAVAX_ADDRESS, deployer)
      dai = IERC20__factory.connect(DAI_ADDRESS, deployer)
      wbtc = IERC20__factory.connect(WBTC_ADDRESS, deployer)
      usdc = IERC20__factory.connect(USDC_ADDRESS, deployer)

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

    describe('getBestAmountIn', function () {
      it('should revert if swap is impossible', async function () {
        const amountOut = parseEther('1,000')
        const call0 = dex.getBestAmountIn(WAVAX_ADDRESS, invalidToken.address, amountOut)
        const call1 = dex.getBestAmountIn(DAI_ADDRESS, invalidToken.address, amountOut)
        await expect(call0).revertedWith('no-path-found')
        await expect(call1).revertedWith('no-path-found')
      })

      it('should get best amountIn for USDC->DAI', async function () {
        // given
        const amountOut = parseEther('997')
        const [amountInA] = await router.getAmountsIn(amountOut, [USDC_ADDRESS, DAI_ADDRESS])
        const [amountInB] = await router.getAmountsIn(amountOut, [USDC_ADDRESS, WAVAX_ADDRESS, DAI_ADDRESS])
        const bestAmountIn = min(amountInA, amountInB)
        expect(bestAmountIn).closeTo(parseUnits('1,002', 6), parseUnits('1', 6))

        // when
        const {_amountIn} = await dex.callStatic.getBestAmountIn(USDC_ADDRESS, DAI_ADDRESS, amountOut)

        // then
        expect(_amountIn).eq(bestAmountIn)
      })
    })

    describe('getBestAmountOut', function () {
      it('should revert if swap is impossible', async function () {
        const amountIn = parseEther('1,000')
        const call0 = dex.getBestAmountOut(WAVAX_ADDRESS, invalidToken.address, amountIn)
        const call1 = dex.getBestAmountOut(DAI_ADDRESS, invalidToken.address, amountIn)
        await expect(call0).revertedWith('no-path-found')
        await expect(call1).revertedWith('no-path-found')
      })

      it('should get best amountOut for WBTC->DAI', async function () {
        // given
        const amountIn = parseUnits('1', 8)
        const [, amountOutA] = await router.getAmountsOut(amountIn, [WBTC_ADDRESS, DAI_ADDRESS])
        const [, , amountOutB] = await router.getAmountsOut(amountIn, [WBTC_ADDRESS, WAVAX_ADDRESS, DAI_ADDRESS])
        const bestAmountOut = max(amountOutA, amountOutB)
        expect(bestAmountOut).closeTo(parseEther('38,754'), parseEther('1'))

        // when
        const {_amountOut} = await dex.callStatic.getBestAmountOut(WBTC_ADDRESS, DAI_ADDRESS, amountIn)

        // then
        expect(_amountOut).eq(bestAmountOut)
      })
    })

    describe('swapExactInput', function () {
      it('should swap WAVAX->DAI', async function () {
        // given
        const amountIn = parseEther('1')
        const {_amountOut, _path} = await dex.callStatic.getBestAmountOut(WAVAX_ADDRESS, DAI_ADDRESS, amountIn)
        expect(_path).deep.eq(abi.encode(['address[]'], [[WAVAX_ADDRESS, DAI_ADDRESS]]))
        const wavaxBefore = await wavax.balanceOf(deployer.address)
        const daiBefore = await dai.balanceOf(deployer.address)

        // when
        await wavax.transfer(dex.address, amountIn)
        await dex.swapExactInput(_path, amountIn, 0, deployer.address)

        // then
        const wavaxAfter = await wavax.balanceOf(deployer.address)
        const daiAfter = await dai.balanceOf(deployer.address)
        expect(wavaxAfter).eq(wavaxBefore.sub(amountIn))
        expect(daiAfter).eq(daiBefore.add(_amountOut)) // no slippage scenario
      })

      it('should swap WBTC->USDC', async function () {
        // given
        const amountIn = parseUnits('1', 8)
        const {_amountOut, _path} = await dex.callStatic.getBestAmountOut(WBTC_ADDRESS, USDC_ADDRESS, amountIn)
        expect(_path).deep.eq(abi.encode(['address[]'], [[WBTC_ADDRESS, WAVAX_ADDRESS, USDC_ADDRESS]]))
        const wbtcBefore = await wbtc.balanceOf(deployer.address)
        const usdcBefore = await usdc.balanceOf(deployer.address)

        // when
        await wbtc.transfer(dex.address, amountIn)
        await dex.swapExactInput(_path, amountIn, 0, deployer.address)

        // then
        const wbtcAfter = await wbtc.balanceOf(deployer.address)
        const usdcAfter = await usdc.balanceOf(deployer.address)
        expect(wbtcAfter).eq(wbtcBefore.sub(amountIn))
        expect(usdcAfter).eq(usdcBefore.add(_amountOut)) // no slippage scenario
      })
    })

    describe('swapExactOutput', function () {
      it('should swap DAI->WAVAX', async function () {
        // given
        const amountOut = parseEther('1')
        const {_amountIn, _path} = await dex.callStatic.getBestAmountIn(DAI_ADDRESS, WAVAX_ADDRESS, amountOut)
        expect(_path).deep.eq(abi.encode(['address[]'], [[DAI_ADDRESS, WAVAX_ADDRESS]]))
        const daiBefore = await dai.balanceOf(deployer.address)
        const wavaxBefore = await wavax.balanceOf(deployer.address)

        // when
        await dai.transfer(dex.address, _amountIn)
        await dex.swapExactOutput(_path, amountOut, _amountIn, deployer.address, deployer.address)

        // then
        const daiAfter = await dai.balanceOf(deployer.address)
        const wavaxAfter = await wavax.balanceOf(deployer.address)
        expect(daiAfter).eq(daiBefore.sub(_amountIn)) // no slippage scenario
        expect(wavaxAfter).eq(wavaxBefore.add(amountOut))
      })

      it('should swap USDC->WBTC', async function () {
        // given
        const amountOut = parseUnits('1', 8)
        const {_amountIn, _path} = await dex.callStatic.getBestAmountIn(USDC_ADDRESS, WBTC_ADDRESS, amountOut)
        expect(_path).deep.eq(abi.encode(['address[]'], [[USDC_ADDRESS, WAVAX_ADDRESS, WBTC_ADDRESS]]))
        const usdcBefore = await usdc.balanceOf(deployer.address)
        const wbtcBefore = await wbtc.balanceOf(deployer.address)

        // when
        await usdc.transfer(dex.address, _amountIn)
        await dex.swapExactOutput(_path, amountOut, _amountIn, deployer.address, deployer.address)

        // then
        const usdcAfter = await usdc.balanceOf(deployer.address)
        const wbtcAfter = await wbtc.balanceOf(deployer.address)
        expect(usdcAfter).eq(usdcBefore.sub(_amountIn)) // no slippage scenario
        expect(wbtcAfter).eq(wbtcBefore.add(amountOut))
      })

      it('should return remaining if any', async function () {
        // given
        const amountOut = parseUnits('1', 8)
        const {_amountIn, _path} = await dex.callStatic.getBestAmountIn(USDC_ADDRESS, WBTC_ADDRESS, amountOut)
        const usdcBefore = await usdc.balanceOf(deployer.address)
        const wbtcBefore = await wbtc.balanceOf(deployer.address)

        // when
        const amountInMax = _amountIn.mul('2')
        await usdc.transfer(dex.address, amountInMax)
        await dex.swapExactOutput(_path, amountOut, amountInMax, deployer.address, deployer.address)
        expect(await usdc.balanceOf(dex.address)).eq(0)

        // then
        const usdcAfter = await usdc.balanceOf(deployer.address)
        const wbtcAfter = await wbtc.balanceOf(deployer.address)
        expect(usdcAfter).eq(usdcBefore.sub(_amountIn)) // no slippage scenario
        expect(wbtcAfter).eq(wbtcBefore.add(amountOut))
      })
    })
  })
})
