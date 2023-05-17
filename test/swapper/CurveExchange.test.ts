/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {CurveExchange, IERC20, ICurveSwaps} from '../../typechain-types'
import {Addresses} from '../../helpers/address'
import {parseEther, parseUnits} from '../helpers'
import {adjustBalance} from '../helpers/balance'
import {CurveSwapParams, CurveSwapRoute} from '../helpers/curve-exchange'

const {MaxUint256, AddressZero} = ethers.constants

const abi = ethers.utils.defaultAbiCoder

describe('CurveExchange', function () {
  describe('CurveExchange @mainnet', function () {
    const {WETH, DAI, WBTC, USDC, MUSD, Curve, STG, FRAX} = Addresses.mainnet

    let snapshotId: string
    let deployer: SignerWithAddress
    let dex: CurveExchange
    let weth: IERC20
    let dai: IERC20
    let wbtc: IERC20
    let usdc: IERC20
    let musd: IERC20
    let stg: IERC20
    let frax: IERC20
    let swaps: ICurveSwaps

    beforeEach(async function () {
      snapshotId = await ethers.provider.send('evm_snapshot', [])
      ;[deployer] = await ethers.getSigners()

      const _dexFactory = await ethers.getContractFactory('CurveExchange', deployer)
      dex = await _dexFactory.deploy(Curve.ADDRESS_PROVIDER)
      await dex.deployed()

      weth = await ethers.getContractAt('@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20', WETH, deployer)
      dai = await ethers.getContractAt('@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20', DAI, deployer)
      wbtc = await ethers.getContractAt('@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20', WBTC, deployer)
      usdc = await ethers.getContractAt('@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20', USDC, deployer)
      musd = await ethers.getContractAt('@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20', MUSD, deployer)
      stg = await ethers.getContractAt('@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20', STG, deployer)
      frax = await ethers.getContractAt('@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20', FRAX, deployer)

      const addressProvider = await ethers.getContractAt('ICurveAddressProvider', Curve.ADDRESS_PROVIDER, deployer)
      swaps = await ethers.getContractAt('ICurveSwaps', await addressProvider.get_address(2), deployer)

      await adjustBalance(weth.address, deployer.address, parseEther('1,000,000'))
      await adjustBalance(dai.address, deployer.address, parseEther('1,000,000'))
      await adjustBalance(musd.address, deployer.address, parseEther('1,000,000'))
      await adjustBalance(wbtc.address, deployer.address, parseUnits('1,000,000', 8))
      await adjustBalance(usdc.address, deployer.address, parseUnits('1,000,000', 6))
      await adjustBalance(stg.address, deployer.address, parseEther('1,000,000'))
      await adjustBalance(frax.address, deployer.address, parseEther('1,000,000'))
    })

    describe('Curve Exchange contract (Swaps)', function () {
      it('should swap USDC->DAI (native pool) using best rate', async function () {
        // given
        const amountIn = parseUnits('1', 6)
        const [, amountOutMin] = await swaps.get_best_rate(USDC, DAI, amountIn)
        const daiBefore = await dai.balanceOf(deployer.address)

        // when
        await usdc.approve(swaps.address, MaxUint256)

        const tx = await swaps.exchange_with_best_rate(USDC, DAI, amountIn, 0, deployer.address)

        // then
        const {gasUsed} = await tx.wait()
        expect(gasUsed.toNumber()).closeTo(2e6, 250e3) // ~2M gas!
        const daiAfter = await dai.balanceOf(deployer.address)
        const amountOut = daiAfter.sub(daiBefore)
        expect(amountOut).closeTo(amountOutMin, parseEther('0.000001'))
      })

      it('should swap USDC->DAI (native pool) using preset pool', async function () {
        // given
        const amountIn = parseUnits('1', 6)
        const [poolAddress, amountOutMin] = await swaps.get_best_rate(USDC, DAI, amountIn)
        const daiBefore = await dai.balanceOf(deployer.address)

        // when
        await usdc.approve(swaps.address, MaxUint256)
        const tx = await swaps.exchange(poolAddress, USDC, DAI, amountIn, 0, deployer.address)

        // then
        const {gasUsed} = await tx.wait()
        expect(gasUsed.toNumber()).closeTo(200e3, 50e3)
        const daiAfter = await dai.balanceOf(deployer.address)
        const amountOut = daiAfter.sub(daiBefore)
        expect(amountOut).closeTo(amountOutMin, parseEther('0.000001'))
      })

      it('should swap USDC->STG (factory pool) using best rate', async function () {
        // given
        const amountIn = parseUnits('1', 6)
        const [poolAddress, amountOutMin] = await swaps.get_best_rate(USDC, STG, amountIn)
        expect(poolAddress).eq(AddressZero)

        // when
        await usdc.approve(swaps.address, MaxUint256)
        const tx = swaps.exchange_with_best_rate(USDC, STG, amountIn, amountOutMin, deployer.address)

        // then
        await expect(tx).revertedWith('No available market') // Swaps basic functions don't support factory pools
      })

      it('should swap USDC->STG (factory pool) using preset pool', async function () {
        const amountIn = parseUnits('1', 6)
        const [poolAddress, amountOutMin] = await swaps.get_best_rate(USDC, STG, amountIn)
        expect(poolAddress).eq(AddressZero)

        // when
        await usdc.approve(swaps.address, MaxUint256)
        const tx = swaps.exchange(Curve.STG_USDC_POOL, USDC, STG, amountIn, amountOutMin, deployer.address)

        // then
        await expect(tx).revertedWith('No available market') // Swaps basic functions don't support factory pools
      })

      it('should swap STG->USDC using exchange_multiple', async function () {
        const usdcBefore = await usdc.balanceOf(deployer.address)
        const amountIn = parseUnits('1', 18)

        const route: CurveSwapRoute = [
          STG,
          Curve.STG_USDC_POOL,
          USDC,
          AddressZero,
          AddressZero,
          AddressZero,
          AddressZero,
          AddressZero,
          AddressZero,
        ]

        const params: CurveSwapParams = [
          [0, 1, 3],
          [0, 0, 0],
          [0, 0, 0],
          [0, 0, 0],
        ]

        const amountOutMin = await swaps.get_exchange_multiple_amount(route, params, amountIn)

        // when
        await stg.approve(swaps.address, MaxUint256)
        const tx = await swaps.exchange_multiple(
          route,
          params,
          amountIn,
          amountOutMin,
          [AddressZero, AddressZero, AddressZero, AddressZero],
          deployer.address
        )

        // then
        const {gasUsed} = await tx.wait()
        expect(gasUsed.toNumber()).closeTo(330e3, 25e3)
        const usdcAfter = await usdc.balanceOf(deployer.address)
        expect(usdcAfter).eq(usdcBefore.add(amountOutMin))
      })

      it('should swap STG->FRAX using exchange_multiple', async function () {
        const fraxBefore = await frax.balanceOf(deployer.address)
        const amountIn = parseUnits('1', 18)

        const route: CurveSwapRoute = [
          STG,
          Curve.STG_USDC_POOL,
          USDC,
          Curve.FRAX_3CRV_POOL,
          FRAX,
          AddressZero,
          AddressZero,
          AddressZero,
          AddressZero,
        ]

        const params: CurveSwapParams = [
          [0, 1, 3],
          [2, 0, 2],
          [0, 0, 0],
          [0, 0, 0],
        ]

        const expectedAmountOut = await swaps.get_exchange_multiple_amount(route, params, amountIn)

        // when
        await stg.approve(swaps.address, MaxUint256)
        const tx = await swaps.exchange_multiple(
          route,
          params,
          amountIn,
          0,
          [AddressZero, AddressZero, AddressZero, AddressZero],
          deployer.address
        )

        // then
        const {gasUsed} = await tx.wait()
        expect(gasUsed.toNumber()).closeTo(600e3, 50e3)
        const fraxAfter = await frax.balanceOf(deployer.address)
        const received = fraxAfter.sub(fraxBefore)
        expect(received).closeTo(expectedAmountOut, parseEther('0.0001'))
      })
    })

    afterEach(async function () {
      await ethers.provider.send('evm_revert', [snapshotId])
    })

    describe('getAmountsOut', function () {
      it('should getAmountsOut for USDC->DAI', async function () {
        // given
        const amountIn = parseUnits('1', 6)
        const route: CurveSwapRoute = [
          USDC,
          Curve.TRIPOOL_POOL,
          DAI,
          AddressZero,
          AddressZero,
          AddressZero,
          AddressZero,
          AddressZero,
          AddressZero,
        ]

        const params: CurveSwapParams = [
          [1, 0, 1],
          [0, 0, 0],
          [0, 0, 0],
          [0, 0, 0],
        ]

        const expectedAmountOut = await swaps.get_exchange_multiple_amount(route, params, amountIn)
        const encodedPath = abi.encode(['address[9]', 'uint256[3][4]'], [route, params])

        // when
        const actualAmountOut = await dex.callStatic.getAmountsOut(amountIn, encodedPath)

        // then
        expect(expectedAmountOut).eq(actualAmountOut)
      })
    })

    describe('swapExactInput', function () {
      it('should swap DAI->USDC', async function () {
        // given
        const amountIn = parseEther('1')
        const route: CurveSwapRoute = [
          DAI,
          Curve.TRIPOOL_POOL,
          USDC,
          AddressZero,
          AddressZero,
          AddressZero,
          AddressZero,
          AddressZero,
          AddressZero,
        ]

        const params: CurveSwapParams = [
          [0, 1, 1],
          [0, 0, 0],
          [0, 0, 0],
          [0, 0, 0],
        ]

        const encodedPath = abi.encode(['address[9]', 'uint256[3][4]'], [route, params])
        const amountOut = await dex.getAmountsOut(amountIn, encodedPath)
        const daiBefore = await dai.balanceOf(deployer.address)
        const usdcBefore = await usdc.balanceOf(deployer.address)

        // when
        await dai.transfer(dex.address, amountIn)
        await dex.swapExactInput(encodedPath, amountIn, 0, deployer.address)

        // then
        const daiAfter = await dai.balanceOf(deployer.address)
        const usdcAfter = await usdc.balanceOf(deployer.address)
        expect(daiAfter).eq(daiBefore.sub(amountIn))
        expect(usdcAfter).closeTo(usdcBefore.add(amountOut), 1) // no slippage scenario
      })

      it('should swap MUSD->USDC', async function () {
        // given
        const amountIn = parseEther('1')
        const route: CurveSwapRoute = [
          MUSD,
          Curve.MUSD_POOL,
          USDC,
          AddressZero,
          AddressZero,
          AddressZero,
          AddressZero,
          AddressZero,
          AddressZero,
        ]

        const params: CurveSwapParams = [
          [0, 2, 2],
          [0, 0, 0],
          [0, 0, 0],
          [0, 0, 0],
        ]

        const encodedPath = abi.encode(['address[9]', 'uint256[3][4]'], [route, params])
        const amountOut = await dex.getAmountsOut(amountIn, encodedPath)
        const musdBefore = await musd.balanceOf(deployer.address)
        const usdcBefore = await usdc.balanceOf(deployer.address)

        // when
        await musd.transfer(dex.address, amountIn)
        await dex.swapExactInput(encodedPath, amountIn, 0, deployer.address)

        // then
        const musdAfter = await musd.balanceOf(deployer.address)
        const usdcAfter = await usdc.balanceOf(deployer.address)
        expect(musdAfter).eq(musdBefore.sub(amountIn))
        expect(usdcAfter).eq(usdcBefore.add(amountOut)) // no slippage scenario
      })

      it('should swap STG->USDC', async function () {
        // given
        const amountIn = parseEther('1')

        const route: CurveSwapRoute = [
          STG,
          Curve.STG_USDC_POOL,
          USDC,
          AddressZero,
          AddressZero,
          AddressZero,
          AddressZero,
          AddressZero,
          AddressZero,
        ]

        const params: CurveSwapParams = [
          [0, 1, 3],
          [0, 0, 0],
          [0, 0, 0],
          [0, 0, 0],
        ]

        const encodedPath = abi.encode(['address[9]', 'uint256[3][4]'], [route, params])
        const amountOut = await dex.getAmountsOut(amountIn, encodedPath)
        const stgBefore = await stg.balanceOf(deployer.address)
        const usdcBefore = await usdc.balanceOf(deployer.address)

        // when
        await stg.transfer(dex.address, amountIn)
        await dex.swapExactInput(encodedPath, amountIn, 0, deployer.address)

        // then
        const stgAfter = await stg.balanceOf(deployer.address)
        const usdcAfter = await usdc.balanceOf(deployer.address)
        expect(stgAfter).eq(stgBefore.sub(amountIn))
        expect(usdcAfter).eq(usdcBefore.add(amountOut)) // no slippage scenario
      })
    })
  })
})
