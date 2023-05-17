/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {ChainlinkMainnetPriceProvider} from '../../typechain-types'
import {Addresses} from '../../helpers/address'
import {parseEther, parseUnits} from '../helpers'
import Quote from '../helpers/quotes'

const {DAI, WETH, WBTC} = Addresses.mainnet

describe('ChainlinkMainnetPriceProvider @mainnet', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let priceProvider: ChainlinkMainnetPriceProvider

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer] = await ethers.getSigners()

    const priceProviderFactory = await ethers.getContractFactory('ChainlinkMainnetPriceProvider', deployer)
    priceProvider = await priceProviderFactory.deploy()
    await priceProvider.deployed()
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('quote', function () {
    it('should revert if aggregator does not exist', async function () {
      const tx = priceProvider.quote(WETH, ethers.constants.AddressZero, parseEther('1'))
      await expect(tx).revertedWith('token-without-aggregator')
    })

    it('should quote same token to same token', async function () {
      const amountIn = parseEther('100')
      const {_amountOut} = await priceProvider.quote(WETH, WETH, amountIn)
      expect(_amountOut).eq(amountIn)
    })

    it('should quote 1 WETH to DAI', async function () {
      const {_amountOut} = await priceProvider.quote(WETH, DAI, parseEther('1'))
      expect(_amountOut).closeTo(Quote.mainnet.ETH_USD, parseEther('10'))
    })

    it('should quote 1 WBTC to DAI', async function () {
      const {_amountOut} = await priceProvider.quote(WBTC, DAI, parseUnits('1', 8))
      expect(_amountOut).closeTo(Quote.mainnet.BTC_USD, parseEther('100'))
    })

    it('should quote 1 WBTC to WETH', async function () {
      const {_amountOut} = await priceProvider.quote(WBTC, WETH, parseUnits('1', 8))
      expect(_amountOut).closeTo(Quote.mainnet.BTC_ETH, parseEther('1'))
    })

    it('should quote 1 DAI to WETH', async function () {
      const {_amountOut} = await priceProvider.quote(DAI, WETH, parseEther('1'))
      expect(_amountOut).closeTo(Quote.mainnet.USD_ETH, parseEther('0.0001'))
    })

    it('should quote 1 DAI to WBTC', async function () {
      const {_amountOut} = await priceProvider.quote(DAI, WBTC, parseEther('1'))
      expect(_amountOut).closeTo(Quote.mainnet.USD_BTC, parseEther('0.0001'))
    })
  })
})
