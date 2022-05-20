/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {ChainlinkPriceProvider, ChainlinkPriceProvider__factory} from '../../typechain-types'
import Address from '../../helpers/address'
import {parseEther, parseUnits} from '../helpers'

const {
  DAI_ADDRESS,
  WETH_ADDRESS,
  WBTC_ADDRESS,
  CHAINLINK_DAI_USD_AGGREGATOR,
  CHAINLINK_ETH_USD_AGGREGATOR,
  CHAINLINK_BTC_USD_AGGREGATOR,
} = Address.mainnet

describe('ChainlinkPriceProvider @mainnet', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let governor: SignerWithAddress
  let priceProvider: ChainlinkPriceProvider

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer, governor] = await ethers.getSigners()

    const priceProviderFactory = new ChainlinkPriceProvider__factory(deployer)
    priceProvider = await priceProviderFactory.deploy()
    await priceProvider.deployed()
    await priceProvider.transferGovernorship(governor.address)
    await priceProvider.connect(governor).acceptGovernorship()

    await priceProvider.connect(governor).updateAggregator(DAI_ADDRESS, CHAINLINK_DAI_USD_AGGREGATOR)
    await priceProvider.connect(governor).updateAggregator(WETH_ADDRESS, CHAINLINK_ETH_USD_AGGREGATOR)
    await priceProvider.connect(governor).updateAggregator(WBTC_ADDRESS, CHAINLINK_BTC_USD_AGGREGATOR)
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('getPriceInUsd', function () {
    it('should WETH price', async function () {
      const {_priceInUsd} = await priceProvider.getPriceInUsd(WETH_ADDRESS)
      expect(_priceInUsd).closeTo(parseEther('3,236'), parseEther('1'))
    })

    it('should WBTC price', async function () {
      const {_priceInUsd} = await priceProvider.getPriceInUsd(WBTC_ADDRESS)
      expect(_priceInUsd).closeTo(parseEther('43,675'), parseEther('1'))
    })

    it('should DAI price', async function () {
      const {_priceInUsd} = await priceProvider.getPriceInUsd(DAI_ADDRESS)
      expect(_priceInUsd).closeTo(parseEther('1'), parseEther('0.1'))
    })
  })

  describe('quote', function () {
    it('should revert if aggregator does not exist', async function () {
      const tx = priceProvider.quote(WETH_ADDRESS, ethers.constants.AddressZero, parseEther('1'))
      await expect(tx).revertedWith('token-without-aggregator')
    })

    it('should quote same token to same token', async function () {
      const amountIn = parseEther('100')
      const {_amountOut} = await priceProvider.quote(WETH_ADDRESS, WETH_ADDRESS, amountIn)
      expect(_amountOut).eq(amountIn)
    })

    it('should quote 1 WETH to DAI', async function () {
      const {_amountOut} = await priceProvider.quote(WETH_ADDRESS, DAI_ADDRESS, parseEther('1'))
      expect(_amountOut).closeTo(parseEther('3,235'), parseEther('1'))
    })

    it('should quote 1 WBTC to DAI', async function () {
      const {_amountOut} = await priceProvider.quote(WBTC_ADDRESS, DAI_ADDRESS, parseUnits('1', 8))
      expect(_amountOut).closeTo(parseEther('43,666'), parseEther('1'))
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

  describe('updateAggregator', function () {
    it('should revert if not governor', async function () {
      const tx = priceProvider.updateAggregator(WETH_ADDRESS, CHAINLINK_ETH_USD_AGGREGATOR)
      await expect(tx).revertedWith('not-governor')
    })

    it('should revert if token is null', async function () {
      const tx = priceProvider
        .connect(governor)
        .updateAggregator(ethers.constants.AddressZero, CHAINLINK_ETH_USD_AGGREGATOR)
      await expect(tx).revertedWith('token-is-null')
    })

    it('should revert if using same aggregator as current', async function () {
      const tx = priceProvider.connect(governor).updateAggregator(WETH_ADDRESS, CHAINLINK_ETH_USD_AGGREGATOR)
      await expect(tx).revertedWith('same-as-current')
    })

    it('should update aggregator', async function () {
      const before = await priceProvider.aggregators(WETH_ADDRESS)
      expect(before).not.eq(ethers.constants.AddressZero)
      await priceProvider.connect(governor).updateAggregator(WETH_ADDRESS, CHAINLINK_BTC_USD_AGGREGATOR)
      const after = await priceProvider.aggregators(WETH_ADDRESS)
      expect(after).eq(CHAINLINK_BTC_USD_AGGREGATOR).not.eq(before)
    })

    it('should set aggregator to null', async function () {
      const before = await priceProvider.aggregators(WETH_ADDRESS)
      expect(before).not.eq(ethers.constants.AddressZero)
      await priceProvider.connect(governor).updateAggregator(WETH_ADDRESS, ethers.constants.AddressZero)
      const after = await priceProvider.aggregators(WETH_ADDRESS)
      expect(after).eq(ethers.constants.AddressZero)
    })
  })
})
