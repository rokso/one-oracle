/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {PriceProviderMock, PriceProviderMock__factory} from '../../typechain-types'
import Address from '../../helpers/address'
import {parseEther, parseUnits, toUSD} from '../helpers'

const {USDC_ADDRESS, WETH_ADDRESS, WBTC_ADDRESS, DAI_ADDRESS} = Address.mainnet

describe('PriceProvider @mainnet', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let priceProvider: PriceProviderMock

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer] = await ethers.getSigners()

    const priceProviderFactory = new PriceProviderMock__factory(deployer)
    priceProvider = await priceProviderFactory.deploy()
    await priceProvider.deployed()

    await priceProvider.setPriceInUsd(WETH_ADDRESS, toUSD('3,231.1234'))
    await priceProvider.setPriceInUsd(WBTC_ADDRESS, toUSD('43,613.1234'))
    await priceProvider.setPriceInUsd(USDC_ADDRESS, toUSD('0.9876'))
    await priceProvider.setPriceInUsd(DAI_ADDRESS, toUSD('1.0123'))
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('quote', function () {
    it('should quote same token to same token', async function () {
      const amountIn = parseEther('100')
      const {_amountOut} = await priceProvider.quote(WETH_ADDRESS, WETH_ADDRESS, amountIn)
      expect(_amountOut).eq(amountIn)
    })

    it('should quote 1 WETH to DAI', async function () {
      const {_amountOut} = await priceProvider.quote(WETH_ADDRESS, DAI_ADDRESS, parseEther('1'))
      expect(_amountOut).closeTo(parseEther('3,191'), parseEther('1'))
    })

    it('should quote 1 WBTC to DAI', async function () {
      const {_amountOut} = await priceProvider.quote(WBTC_ADDRESS, DAI_ADDRESS, parseUnits('1', 8))
      expect(_amountOut).closeTo(parseEther('43,083'), parseEther('1'))
    })

    it('should quote 1 WBTC to WETH', async function () {
      const {_amountOut} = await priceProvider.quote(WBTC_ADDRESS, WETH_ADDRESS, parseUnits('1', 8))
      expect(_amountOut).closeTo(parseEther('13'), parseEther('1'))
    })

    it('should quote 1 DAI to WETH', async function () {
      const {_amountOut} = await priceProvider.quote(DAI_ADDRESS, WETH_ADDRESS, parseEther('1'))
      expect(_amountOut).closeTo(parseEther('0.0003'), parseEther('0.0001'))
    })

    it('should quote 1 DAI to WBTC', async function () {
      const {_amountOut} = await priceProvider.quote(DAI_ADDRESS, WBTC_ADDRESS, parseEther('1'))
      expect(_amountOut).closeTo(parseUnits('0.00002', 8), parseUnits('0.00001', 8))
    })
  })

  describe('quoteTokenToUsd', function () {
    it('should quote WETH to USD (18 decimals)', async function () {
      const {_amountOut} = await priceProvider.quoteTokenToUsd(WETH_ADDRESS, parseEther('1'))
      expect(_amountOut).eq(parseEther('3,231.1234'))
    })

    it('should quote WBTC to USD (8 decimals)', async function () {
      const {_amountOut} = await priceProvider.quoteTokenToUsd(WBTC_ADDRESS, parseUnits('10', 8))
      expect(_amountOut).eq(parseEther('436,131.234'))
    })

    it('should quote USDC to USD (6 decimals)', async function () {
      const {_amountOut} = await priceProvider.quoteTokenToUsd(USDC_ADDRESS, parseUnits('100', 6))
      expect(_amountOut).eq(parseEther('98.76'))
    })
  })

  describe('quoteUsdToToken', function () {
    it('should quote USD to WETH (18 decimals)', async function () {
      const {_priceInUsd} = await priceProvider.getPriceInUsd(WETH_ADDRESS)
      const {_amountOut} = await priceProvider.quoteUsdToToken(WETH_ADDRESS, _priceInUsd)
      expect(_amountOut).eq(parseEther('1'))
    })

    it('should quote USD to WBTC (8 decimals)', async function () {
      const {_priceInUsd} = await priceProvider.getPriceInUsd(WBTC_ADDRESS)
      const {_amountOut} = await priceProvider.quoteUsdToToken(WBTC_ADDRESS, _priceInUsd.mul('10'))
      expect(_amountOut).eq(parseUnits('10', 8))
    })

    it('should quote USD to USDC (6 decimals)', async function () {
      const {_priceInUsd} = await priceProvider.getPriceInUsd(USDC_ADDRESS)
      const {_amountOut} = await priceProvider.quoteUsdToToken(USDC_ADDRESS, _priceInUsd.mul('100'))
      expect(_amountOut).eq(parseUnits('100', 6))
    })
  })
})
