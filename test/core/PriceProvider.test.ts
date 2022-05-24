/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {PriceProviderMock, PriceProviderMock__factory} from '../../typechain-types'
import Address from '../../helpers/address'
import {parseEther, parseUnits, timestampFromLatestBlock} from '../helpers'

const {USDC_ADDRESS, WETH_ADDRESS, WBTC_ADDRESS} = Address.mainnet

describe('PriceProvider @mainnet', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let priceProvider: PriceProviderMock
  let lastUpdatedAt: number

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer] = await ethers.getSigners()

    const priceProviderFactory = new PriceProviderMock__factory(deployer)
    priceProvider = await priceProviderFactory.deploy()
    await priceProvider.deployed()

    lastUpdatedAt = await timestampFromLatestBlock()
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('quoteTokenToUsd', function () {
    it('should quote WETH to USD (18 decimals)', async function () {
      // given
      const priceInUsd = parseEther('3,236.1234')
      await priceProvider.setPriceInUsd(priceInUsd, lastUpdatedAt)

      // when
      const {_amountOut, _lastUpdatedAt} = await priceProvider.quoteTokenToUsd(WETH_ADDRESS, parseEther('1'))

      // then
      expect(_amountOut).eq(parseEther('3,236.1234'))
      expect(_lastUpdatedAt).eq(lastUpdatedAt)
    })

    it('should quote WBTC to USD (8 decimals)', async function () {
      // given
      const priceInUsd = parseEther('43,675.1234')
      await priceProvider.setPriceInUsd(priceInUsd, lastUpdatedAt)

      // when
      const {_amountOut, _lastUpdatedAt} = await priceProvider.quoteTokenToUsd(WBTC_ADDRESS, parseUnits('10', 8))

      // then
      expect(_amountOut).eq(parseEther('436,751.234'))
      expect(_lastUpdatedAt).eq(lastUpdatedAt)
    })

    it('should quote USDC to USD (6 decimals)', async function () {
      // given
      const priceInUsd = parseEther('0.9876')
      await priceProvider.setPriceInUsd(priceInUsd, lastUpdatedAt)

      // when
      const {_amountOut, _lastUpdatedAt} = await priceProvider.quoteTokenToUsd(USDC_ADDRESS, parseUnits('100', 6))

      // then
      expect(_amountOut).eq(parseEther('98.76'))
      expect(_lastUpdatedAt).eq(lastUpdatedAt)
    })
  })

  describe('quoteUsdToToken', function () {
    it('should quote USD to WETH (18 decimals)', async function () {
      // given
      const priceInUsd = parseEther('3,236')
      await priceProvider.setPriceInUsd(priceInUsd, lastUpdatedAt)

      // when
      const {_amountOut, _lastUpdatedAt} = await priceProvider.quoteUsdToToken(WETH_ADDRESS, parseEther('3,236'))

      // then
      expect(_amountOut).eq(parseEther('1'))
      expect(_lastUpdatedAt).eq(lastUpdatedAt)
    })

    it('should quote USD to WBTC (8 decimals)', async function () {
      // given
      const priceInUsd = parseEther('43,675.1234')
      await priceProvider.setPriceInUsd(priceInUsd, lastUpdatedAt)

      // when
      const {_amountOut, _lastUpdatedAt} = await priceProvider.quoteUsdToToken(WBTC_ADDRESS, priceInUsd.mul('10'))

      // then
      expect(_amountOut).eq(parseUnits('10', 8))
      expect(_lastUpdatedAt).eq(lastUpdatedAt)
    })

    it('should quote USD to USDC (6 decimals)', async function () {
      // given
      const priceInUsd = parseEther('0.9876')
      await priceProvider.setPriceInUsd(priceInUsd, lastUpdatedAt)

      // when
      const {_amountOut, _lastUpdatedAt} = await priceProvider.quoteUsdToToken(USDC_ADDRESS, priceInUsd.mul('100'))

      // then
      expect(_amountOut).eq(parseUnits('100', 6))
      expect(_lastUpdatedAt).eq(lastUpdatedAt)
    })
  })
})
