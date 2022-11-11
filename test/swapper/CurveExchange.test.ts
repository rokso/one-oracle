/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {CurveExchange, IERC20__factory, IERC20, CurveExchange__factory} from '../../typechain-types'
import Address from '../../helpers/address'
import {parseEther, parseUnits} from '../helpers'
import {adjustBalance} from '../helpers/balance'

describe('CurveExchange', function () {
  describe('CurveExchange @mainnet', function () {
    const {WETH, DAI, WBTC, USDC, MUSD, Curve} = Address.mainnet

    let snapshotId: string
    let deployer: SignerWithAddress
    let invalidToken: SignerWithAddress
    let dex: CurveExchange
    let weth: IERC20
    let dai: IERC20
    let wbtc: IERC20
    let usdc: IERC20
    let musd: IERC20

    beforeEach(async function () {
      snapshotId = await ethers.provider.send('evm_snapshot', [])
      ;[deployer, invalidToken] = await ethers.getSigners()

      const _dexFactory = new CurveExchange__factory(deployer)
      dex = await _dexFactory.deploy(Curve.ADDRESS_PROVIDER)
      await dex.deployed()

      weth = IERC20__factory.connect(WETH, deployer)
      dai = IERC20__factory.connect(DAI, deployer)
      wbtc = IERC20__factory.connect(WBTC, deployer)
      usdc = IERC20__factory.connect(USDC, deployer)
      musd = IERC20__factory.connect(MUSD, deployer)

      await adjustBalance(weth.address, deployer.address, parseEther('1,000,000'))
      await adjustBalance(dai.address, deployer.address, parseEther('1,000,000'))
      await adjustBalance(musd.address, deployer.address, parseEther('1,000,000'))
      await adjustBalance(wbtc.address, deployer.address, parseUnits('1,000,000', 8))
      await adjustBalance(usdc.address, deployer.address, parseUnits('1,000,000', 6))
    })

    afterEach(async function () {
      await ethers.provider.send('evm_revert', [snapshotId])
    })

    describe('getBestAmountOut', function () {
      it('should return 0 amount out if swap done for invalid token', async function () {
        const amountIn = parseEther('1')
        const {_amountOut, _path} = await dex.callStatic.getBestAmountOut(WETH, invalidToken.address, amountIn)
        const [_curvePool] = ethers.utils.defaultAbiCoder.decode(['address', 'address', 'address'], _path)
        expect(_curvePool).eq(ethers.constants.AddressZero)
        expect(_amountOut).eq(0)
      })

      it('should return 0 amount out when swap is not possible for WETH -> DAI', async function () {
        const amountIn = parseEther('1')
        const {_amountOut, _path} = await dex.callStatic.getBestAmountOut(WETH, DAI, amountIn)
        const [_curvePool] = ethers.utils.defaultAbiCoder.decode(['address', 'address', 'address'], _path)
        expect(_curvePool).eq(ethers.constants.AddressZero)
        expect(_amountOut).eq(0)
      })

      it('should get best amountOut for USDC->DAI', async function () {
        // given
        const amountIn = parseUnits('1', 6)

        // when
        const {_amountOut, _path} = await dex.callStatic.getBestAmountOut(USDC, DAI, amountIn)
        const [_curvePool, _tokenIn, _tokenOut] = ethers.utils.defaultAbiCoder.decode(
          ['address', 'address', 'address'],
          _path
        )

        // then
        expect(_curvePool).not.eq(ethers.constants.AddressZero)
        expect(_tokenIn).eq(USDC)
        expect(_tokenOut).eq(DAI)
        expect(_amountOut).closeTo(parseEther('1'), parseEther('0.01'))
      })
    })

    describe('getAmountsOut', function () {
      it('should getAmountsOut for USDC->DAI', async function () {
        // given
        const amountIn = parseUnits('1', 6)
        const {_amountOut, _path} = await dex.callStatic.getBestAmountOut(USDC, DAI, amountIn)
        const [_curvePool, _tokenIn, _tokenOut] = ethers.utils.defaultAbiCoder.decode(
          ['address', 'address', 'address'],
          _path
        )

        const encodedPath = ethers.utils.defaultAbiCoder.encode(
          ['address', 'address', 'address'],
          [_curvePool, _tokenIn, _tokenOut]
        )

        // when
        const actualAmountOut = await dex.callStatic.getAmountsOut(amountIn, encodedPath)

        // then
        expect(_amountOut).eq(actualAmountOut)
      })
    })

    describe('swapExactInput', function () {
      it('should swap DAI->USDC', async function () {
        // given
        const amountIn = parseEther('1')
        const {_amountOut, _path} = await dex.callStatic.getBestAmountOut(DAI, USDC, amountIn)
        const daiBefore = await dai.balanceOf(deployer.address)
        const usdcBefore = await usdc.balanceOf(deployer.address)

        // when
        await dai.transfer(dex.address, amountIn)
        await dex.swapExactInput(_path, amountIn, 0, deployer.address)

        // then
        const daiAfter = await dai.balanceOf(deployer.address)
        const usdcAfter = await usdc.balanceOf(deployer.address)
        expect(daiAfter).eq(daiBefore.sub(amountIn))
        expect(usdcAfter).eq(usdcBefore.add(_amountOut)) // no slippage scenario
      })

      it('should swap MUSD->USDC', async function () {
        // given
        const amountIn = parseEther('1')
        const {_amountOut, _path} = await dex.callStatic.getBestAmountOut(MUSD, USDC, amountIn)
        const musdBefore = await musd.balanceOf(deployer.address)
        const usdcBefore = await usdc.balanceOf(deployer.address)

        // when
        await musd.transfer(dex.address, amountIn)
        await dex.swapExactInput(_path, amountIn, 0, deployer.address)

        // then
        const musdAfter = await musd.balanceOf(deployer.address)
        const usdcAfter = await usdc.balanceOf(deployer.address)
        expect(musdAfter).eq(musdBefore.sub(amountIn))
        expect(usdcAfter).eq(usdcBefore.add(_amountOut)) // no slippage scenario
      })
    })
  })
})
