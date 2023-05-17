/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {IERC20, UniswapV3Exchange} from '../../typechain-types'
import {Addresses} from '../../helpers/address'
import {parseEther, parseUnits} from '../helpers'
import {adjustBalance} from '../helpers/balance'

const {WETH, DAI, WBTC, USDC} = Addresses.mainnet

describe('UniswapV3Exchange @mainnet', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let dex: UniswapV3Exchange
  let weth: IERC20
  let dai: IERC20
  let wbtc: IERC20
  let usdc: IERC20
  let defaultPoolFee: number

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

    const dexFactory = await ethers.getContractFactory('UniswapV3Exchange', deployer)
    dex = await dexFactory.deploy(WETH)
    await dex.deployed()
    defaultPoolFee = await dex.defaultPoolFee()

    weth = await ethers.getContractAt('@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20', WETH, deployer)
    dai = await ethers.getContractAt('@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20', DAI, deployer)
    wbtc = await ethers.getContractAt('@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20', WBTC, deployer)
    usdc = await ethers.getContractAt('@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20', USDC, deployer)

    await adjustBalance(weth.address, deployer.address, parseEther('1,000,000'))
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
    it('should swap WETH->DAI', async function () {
      // given
      const amountIn = parseEther('1')
      const path = ethers.utils.solidityPack(['address', 'uint24', 'address'], [WETH, defaultPoolFee, DAI])
      const amountOut = await dex.callStatic.getAmountsOut(amountIn, path)
      const wethBefore = await weth.balanceOf(deployer.address)
      const daiBefore = await dai.balanceOf(deployer.address)

      // when
      await weth.transfer(dex.address, amountIn)
      await dex.swapExactInput(path, amountIn, 0, deployer.address)

      // then
      const wethAfter = await weth.balanceOf(deployer.address)
      const daiAfter = await dai.balanceOf(deployer.address)

      const actual = daiAfter.sub(daiBefore)

      expect(wethAfter).eq(wethBefore.sub(amountIn))
      expect(actual).closeTo(amountOut, parseEther('0.1'))
    })

    it('should swap WBTC->WETH->DAI', async function () {
      // given
      const amountIn = parseUnits('1', 8)
      const path = ethers.utils.solidityPack(
        ['address', 'uint24', 'address', 'uint24', 'address'],
        [WBTC, defaultPoolFee, WETH, defaultPoolFee, DAI]
      )
      const amountOut = await dex.callStatic.getAmountsOut(amountIn, path)
      const wbtcBefore = await wbtc.balanceOf(deployer.address)
      const daiBefore = await dai.balanceOf(deployer.address)

      // when
      await wbtc.transfer(dex.address, amountIn)
      await dex.swapExactInput(path, amountIn, 0, deployer.address)

      // then
      const wbtcAfter = await wbtc.balanceOf(deployer.address)
      const daiAfter = await dai.balanceOf(deployer.address)

      const actual = daiAfter.sub(daiBefore)

      expect(wbtcAfter).eq(wbtcBefore.sub(amountIn))
      expect(actual).closeTo(amountOut, parseEther('10'))
    })
  })

  describe('swapExactOutput', function () {
    it('should swap DAI->WETH', async function () {
      // given
      const amountOut = parseEther('1')
      const path = ethers.utils.solidityPack(['address', 'uint24', 'address'], [WETH, defaultPoolFee, DAI])
      const amountIn = await dex.callStatic.getAmountsIn(amountOut, path)
      const daiBefore = await dai.balanceOf(deployer.address)
      const wethBefore = await weth.balanceOf(deployer.address)

      // when
      const amountInMax = amountIn
      await dai.transfer(dex.address, amountInMax)
      await dex.swapExactOutput(path, amountOut, amountInMax, deployer.address, deployer.address)

      // then
      const daiAfter = await dai.balanceOf(deployer.address)
      const wethAfter = await weth.balanceOf(deployer.address)
      const actual = daiBefore.sub(daiAfter)

      expect(actual).closeTo(amountIn, parseEther('10'))
      expect(wethAfter).eq(wethBefore.add(amountOut))
    })

    it('should swap DAI->WETH->WBTC', async function () {
      // given
      const amountOut = parseUnits('0.1', 8)
      const path = ethers.utils.solidityPack(
        ['address', 'uint24', 'address', 'uint24', 'address'],
        [WBTC, defaultPoolFee, WETH, defaultPoolFee, DAI]
      )
      const amountIn = await dex.callStatic.getAmountsIn(amountOut, path)
      const daiBefore = await dai.balanceOf(deployer.address)
      const wbtcBefore = await wbtc.balanceOf(deployer.address)

      // when
      const amountInMax = amountIn
      await dai.transfer(dex.address, amountInMax)
      await dex.swapExactOutput(path, amountOut, amountInMax, deployer.address, deployer.address)

      // then
      const daiAfter = await dai.balanceOf(deployer.address)
      const wbtcAfter = await wbtc.balanceOf(deployer.address)
      const actual = daiBefore.sub(daiAfter)

      expect(actual).closeTo(amountIn, parseEther('10'))
      expect(wbtcAfter).eq(wbtcBefore.add(amountOut))
    })
  })
})
