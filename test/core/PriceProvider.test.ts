/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {PriceProviderMock} from '../../typechain-types'
import {Addresses} from '../../helpers/address'
import {parseEther, parseUnits, toUSD} from '../helpers'

const {USDC, WETH, WBTC, DAI} = Addresses.mainnet

describe('PriceProvider @mainnet', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let priceProvider: PriceProviderMock

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer] = await ethers.getSigners()

    const priceProviderFactory = await ethers.getContractFactory('PriceProviderMock', deployer)
    priceProvider = await priceProviderFactory.deploy()
    await priceProvider.deployed()

    await priceProvider.setPriceInUsd(WETH, toUSD('3,231.1234'))
    await priceProvider.setPriceInUsd(WBTC, toUSD('43,613.1234'))
    await priceProvider.setPriceInUsd(USDC, toUSD('0.9876'))
    await priceProvider.setPriceInUsd(DAI, toUSD('1.0123'))
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('quote', function () {
    it('should quote same token to same token', async function () {
      const amountIn = parseEther('100')
      const {_amountOut} = await priceProvider.quote(WETH, WETH, amountIn)
      expect(_amountOut).eq(amountIn)
    })

    it('should quote 1 WETH to DAI', async function () {
      const {_amountOut} = await priceProvider.quote(WETH, DAI, parseEther('1'))
      expect(_amountOut).closeTo(parseEther('3,191'), parseEther('1'))
    })

    it('should quote 1 WBTC to DAI', async function () {
      const {_amountOut} = await priceProvider.quote(WBTC, DAI, parseUnits('1', 8))
      expect(_amountOut).closeTo(parseEther('43,083'), parseEther('1'))
    })

    it('should quote 1 WBTC to WETH', async function () {
      const {_amountOut} = await priceProvider.quote(WBTC, WETH, parseUnits('1', 8))
      expect(_amountOut).closeTo(parseEther('13'), parseEther('1'))
    })

    it('should quote 1 DAI to WETH', async function () {
      const {_amountOut} = await priceProvider.quote(DAI, WETH, parseEther('1'))
      expect(_amountOut).closeTo(parseEther('0.0003'), parseEther('0.0001'))
    })

    it('should quote 1 DAI to WBTC', async function () {
      const {_amountOut} = await priceProvider.quote(DAI, WBTC, parseEther('1'))
      expect(_amountOut).closeTo(parseUnits('0.00002', 8), parseUnits('0.00001', 8))
    })
  })

  describe('quoteTokenToUsd', function () {
    it('should quote WETH to USD (18 decimals)', async function () {
      const {_amountOut} = await priceProvider.quoteTokenToUsd(WETH, parseEther('1'))
      expect(_amountOut).eq(parseEther('3,231.1234'))
    })

    it('should quote WBTC to USD (8 decimals)', async function () {
      const {_amountOut} = await priceProvider.quoteTokenToUsd(WBTC, parseUnits('10', 8))
      expect(_amountOut).eq(parseEther('436,131.234'))
    })

    it('should quote USDC to USD (6 decimals)', async function () {
      const {_amountOut} = await priceProvider.quoteTokenToUsd(USDC, parseUnits('100', 6))
      expect(_amountOut).eq(parseEther('98.76'))
    })
  })

  describe('quoteUsdToToken', function () {
    it('should quote USD to WETH (18 decimals)', async function () {
      const {_priceInUsd} = await priceProvider.getPriceInUsd(WETH)
      const {_amountOut} = await priceProvider.quoteUsdToToken(WETH, _priceInUsd)
      expect(_amountOut).eq(parseEther('1'))
    })

    it('should quote USD to WBTC (8 decimals)', async function () {
      const {_priceInUsd} = await priceProvider.getPriceInUsd(WBTC)
      const {_amountOut} = await priceProvider.quoteUsdToToken(WBTC, _priceInUsd.mul('10'))
      expect(_amountOut).eq(parseUnits('10', 8))
    })

    it('should quote USD to USDC (6 decimals)', async function () {
      const {_priceInUsd} = await priceProvider.getPriceInUsd(USDC)
      const {_amountOut} = await priceProvider.quoteUsdToToken(USDC, _priceInUsd.mul('100'))
      expect(_amountOut).eq(parseUnits('100', 6))
    })
  })
})
