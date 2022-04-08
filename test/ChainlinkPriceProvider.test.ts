/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {ChainlinkPriceProvider, ChainlinkPriceProvider__factory, IERC20, IERC20__factory} from '../typechain-types'
import Address from '../helpers/address'
import {parseEther, parseUnits} from './helpers'

const {
  DAI_ADDRESS,
  WETH_ADDRESS,
  WBTC_ADDRESS,
  CHAINLINK_MAINNET_DAI_USD_AGGREGATOR,
  CHAINLINK_MAINNET_ETH_USD_AGGREGATOR,
  CHAINLINK_MAINNET_BTC_USD_AGGREGATOR,
} = Address

describe('ChainlinkPriceProvider @mainnet', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let governor: SignerWithAddress
  let priceProvider: ChainlinkPriceProvider
  let dai: IERC20
  let weth: IERC20
  let wbtc: IERC20

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer, governor] = await ethers.getSigners()

    dai = IERC20__factory.connect(DAI_ADDRESS, deployer)
    weth = IERC20__factory.connect(WETH_ADDRESS, deployer)
    wbtc = IERC20__factory.connect(WBTC_ADDRESS, deployer)

    const priceProviderFactory = new ChainlinkPriceProvider__factory(deployer)
    priceProvider = await priceProviderFactory.deploy()
    await priceProvider.deployed()
    await priceProvider.transferGovernorship(governor.address)
    await priceProvider.connect(governor).acceptGovernorship()

    await priceProvider.connect(governor).updateAggregator(dai.address, CHAINLINK_MAINNET_DAI_USD_AGGREGATOR)
    await priceProvider.connect(governor).updateAggregator(weth.address, CHAINLINK_MAINNET_ETH_USD_AGGREGATOR)
    await priceProvider.connect(governor).updateAggregator(wbtc.address, CHAINLINK_MAINNET_BTC_USD_AGGREGATOR)
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('quote', function () {
    it('should revert if aggregator does not exist', async function () {
      const tx = priceProvider.quote(weth.address, ethers.constants.AddressZero, parseEther('1'))
      await expect(tx).revertedWith('token-without-aggregator')
    })

    it('should quote same token to same token', async function () {
      const amountIn = parseEther('100')
      const {_amountOut} = await priceProvider.quote(weth.address, weth.address, amountIn)
      expect(_amountOut).eq(amountIn)
    })

    it('should quote 1 WETH to DAI', async function () {
      const {_amountOut} = await priceProvider.quote(weth.address, dai.address, parseEther('1'))
      expect(_amountOut).closeTo(parseEther('3,235'), parseEther('1'))
    })

    it('should quote 1 WBTC to DAI', async function () {
      const {_amountOut} = await priceProvider.quote(wbtc.address, dai.address, parseUnits('1', 8))
      expect(_amountOut).closeTo(parseEther('43,666'), parseEther('1'))
    })

    it('should quote 1 WBTC to WETH', async function () {
      const {_amountOut} = await priceProvider.quote(wbtc.address, weth.address, parseUnits('1', 8))
      expect(_amountOut).closeTo(parseEther('13'), parseEther('1'))
    })

    it('should quote 1 DAI to WETH', async function () {
      const {_amountOut} = await priceProvider.quote(dai.address, weth.address, parseEther('1'))
      expect(_amountOut).closeTo(parseEther('0.0003'), parseEther('0.0001'))
    })

    it('should quote 1 DAI to WBTC', async function () {
      const {_amountOut} = await priceProvider.quote(dai.address, wbtc.address, parseEther('1'))
      expect(_amountOut).closeTo(parseUnits('0.00002', 8), parseUnits('0.00001', 8))
    })
  })

  describe('quoteTokenToUsd', function () {
    it('should revert if aggregator does not exist', async function () {
      const tx = priceProvider.quoteTokenToUsd(ethers.constants.AddressZero, parseEther('1'))
      await expect(tx).revertedWith('token-without-aggregator')
    })

    it('should quote WETH to USD', async function () {
      const {_amountOut} = await priceProvider.quoteTokenToUsd(weth.address, parseEther('1'))
      expect(_amountOut).closeTo(parseEther('3,236'), parseEther('1'))
    })

    it('should quote WBTC to USD', async function () {
      const {_amountOut} = await priceProvider.quoteTokenToUsd(wbtc.address, parseUnits('10', 8))
      expect(_amountOut).closeTo(parseEther('436,753'), parseEther('1'))
    })

    it('should quote DAI to USD', async function () {
      const {_amountOut} = await priceProvider.quoteTokenToUsd(dai.address, parseEther('100'))
      expect(_amountOut).closeTo(parseEther('100'), parseEther('1'))
    })
  })

  describe('quoteUsdToToken', function () {
    it('should revert if aggregator does not exist', async function () {
      const tx = priceProvider.quoteUsdToToken(ethers.constants.AddressZero, parseEther('1'))
      await expect(tx).revertedWith('token-without-aggregator')
    })

    it('should quote WETH to USD', async function () {
      const {_amountOut} = await priceProvider.quoteUsdToToken(weth.address, parseEther('3,236'))
      expect(_amountOut).closeTo(parseEther('1'), parseEther('1'))
    })

    it('should quote WBTC to USD', async function () {
      const {_amountOut} = await priceProvider.quoteUsdToToken(wbtc.address, parseEther('436,753'))
      expect(_amountOut).closeTo(parseUnits('10', 8), parseEther('1'))
    })

    it('should quote DAI to USD', async function () {
      const {_amountOut} = await priceProvider.quoteUsdToToken(dai.address, parseEther('100'))
      expect(_amountOut).closeTo(parseEther('100'), parseEther('1'))
    })
  })

  describe('updateAggregator', function () {
    it('should revert if not governor', async function () {
      const tx = priceProvider.updateAggregator(weth.address, CHAINLINK_MAINNET_ETH_USD_AGGREGATOR)
      await expect(tx).revertedWith('not-governor')
    })

    it('should revert if token is null', async function () {
      const tx = priceProvider
        .connect(governor)
        .updateAggregator(ethers.constants.AddressZero, CHAINLINK_MAINNET_ETH_USD_AGGREGATOR)
      await expect(tx).revertedWith('token-is-null')
    })

    it('should revert if using same aggregator as current', async function () {
      const tx = priceProvider.connect(governor).updateAggregator(weth.address, CHAINLINK_MAINNET_ETH_USD_AGGREGATOR)
      await expect(tx).revertedWith('same-as-current')
    })

    it('should update aggregator', async function () {
      const before = await priceProvider.aggregators(weth.address)
      expect(before).not.eq(ethers.constants.AddressZero)
      await priceProvider.connect(governor).updateAggregator(weth.address, CHAINLINK_MAINNET_BTC_USD_AGGREGATOR)
      const after = await priceProvider.aggregators(weth.address)
      expect(after).eq(CHAINLINK_MAINNET_BTC_USD_AGGREGATOR).not.eq(before)
    })

    it('should set aggregator to null', async function () {
      const before = await priceProvider.aggregators(weth.address)
      expect(before).not.eq(ethers.constants.AddressZero)
      await priceProvider.connect(governor).updateAggregator(weth.address, ethers.constants.AddressZero)
      const after = await priceProvider.aggregators(weth.address)
      expect(after).eq(ethers.constants.AddressZero)
    })
  })
})
