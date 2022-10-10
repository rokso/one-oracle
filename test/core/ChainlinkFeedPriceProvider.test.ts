/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {
  ChainlinkFeedPriceProvider,
  ChainlinkFeedPriceProvider__factory,
  IERC20,
  IERC20__factory,
} from '../../typechain-types'
import Address from '../../helpers/address'
import {parseEther, parseUnits} from '../helpers'
import Quote from '../helpers/quotes'

const {DAI, WETH, WBTC} = Address.mainnet

describe('ChainlinkFeedPriceProvider @mainnet', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let priceProvider: ChainlinkFeedPriceProvider
  let dai: IERC20
  let weth: IERC20
  let wbtc: IERC20

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer] = await ethers.getSigners()

    dai = IERC20__factory.connect(DAI, deployer)
    weth = IERC20__factory.connect(WETH, deployer)
    wbtc = IERC20__factory.connect(WBTC, deployer)

    const priceProviderFactory = new ChainlinkFeedPriceProvider__factory(deployer)
    priceProvider = await priceProviderFactory.deploy()
    await priceProvider.deployed()
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('quote', function () {
    it('should revert if aggregator does not exist', async function () {
      const tx = priceProvider.quote(weth.address, ethers.constants.AddressZero, parseEther('1'))
      await expect(tx).revertedWith('Feed not found')
    })

    it('should quote same token to same token', async function () {
      const amountIn = parseEther('100')
      const {_amountOut} = await priceProvider.quote(weth.address, weth.address, amountIn)
      expect(_amountOut).eq(amountIn)
    })

    it('should quote 1 WETH to DAI', async function () {
      const {_amountOut} = await priceProvider.quote(weth.address, dai.address, parseEther('1'))
      expect(_amountOut).closeTo(Quote.mainnet.ETH_USD, parseEther('5'))
    })

    it('should quote 1 WBTC to DAI', async function () {
      const {_amountOut} = await priceProvider.quote(wbtc.address, dai.address, parseUnits('1', 8))
      expect(_amountOut).closeTo(Quote.mainnet.BTC_USD, parseEther('50'))
    })

    it('should quote 1 WBTC to WETH', async function () {
      const {_amountOut} = await priceProvider.quote(wbtc.address, weth.address, parseUnits('1', 8))
      expect(_amountOut).closeTo(Quote.mainnet.BTC_ETH, parseEther('1'))
    })

    it('should quote 1 DAI to WETH', async function () {
      const {_amountOut} = await priceProvider.quote(dai.address, weth.address, parseEther('1'))
      expect(_amountOut).closeTo(Quote.mainnet.USD_ETH, parseEther('0.0001'))
    })

    it('should quote 1 DAI to WBTC', async function () {
      const {_amountOut} = await priceProvider.quote(dai.address, wbtc.address, parseEther('1'))
      expect(_amountOut).closeTo(Quote.mainnet.USD_BTC.div(`${1e10}`), parseUnits('0.00001', 8))
    })
  })

  describe('quoteTokenToUsd', function () {
    it('should revert if aggregator does not exist', async function () {
      const tx = priceProvider.quoteTokenToUsd(ethers.constants.AddressZero, parseEther('1'))
      await expect(tx).revertedWith('Feed not found')
    })

    it('should quote WETH to USD', async function () {
      const {_amountOut} = await priceProvider.quoteTokenToUsd(weth.address, parseEther('1'))
      expect(_amountOut).closeTo(Quote.mainnet.ETH_USD, parseEther('5'))
    })

    it('should quote WBTC to USD', async function () {
      const {_amountOut} = await priceProvider.quoteTokenToUsd(wbtc.address, parseUnits('1', 8))
      expect(_amountOut).closeTo(Quote.mainnet.BTC_USD, parseEther('30'))
    })

    it('should quote DAI to USD', async function () {
      const {_amountOut} = await priceProvider.quoteTokenToUsd(dai.address, parseEther('100'))
      expect(_amountOut).closeTo(parseEther('100'), parseEther('1'))
    })
  })

  describe('quoteUsdToToken', function () {
    it('should revert if aggregator does not exist', async function () {
      const tx = priceProvider.quoteUsdToToken(ethers.constants.AddressZero, parseEther('1'))
      await expect(tx).revertedWith('Feed not found')
    })

    it('should quote USD to WETH', async function () {
      const {_amountOut} = await priceProvider.quoteUsdToToken(weth.address, Quote.mainnet.ETH_USD)
      expect(_amountOut).closeTo(parseEther('1'), parseEther('1'))
    })

    it('should quote USD to WBTC', async function () {
      const {_amountOut} = await priceProvider.quoteUsdToToken(wbtc.address, Quote.mainnet.BTC_USD.mul('10'))
      expect(_amountOut).closeTo(parseUnits('10', 8), parseEther('1'))
    })

    it('should quote USD to DAI', async function () {
      const {_amountOut} = await priceProvider.quoteUsdToToken(dai.address, parseEther('100'))
      expect(_amountOut).closeTo(parseEther('100'), parseEther('1'))
    })
  })
})
