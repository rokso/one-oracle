/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {ChainlinkPriceProvider} from '../../typechain-types'
import {Addresses} from '../../helpers/address'
import {parseEther} from '../helpers'
import {smock} from '@defi-wonderland/smock'
import Quote from '../helpers/quotes'

const {
  DAI,
  WETH,
  WBTC,
  WEETH,
  Chainlink: {CHAINLINK_DAI_USD_AGGREGATOR, CHAINLINK_ETH_USD_AGGREGATOR, CHAINLINK_BTC_USD_AGGREGATOR},
  Redstone: {REDSTONE_WEETH_USD_AGGREGATOR},
} = Addresses.mainnet

describe('ChainlinkPriceProvider @mainnet', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let alice: SignerWithAddress
  let priceProvider: ChainlinkPriceProvider

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer, alice] = await ethers.getSigners()

    const addressProvider = await smock.fake('AddressProviderMock', {address: Addresses.ADDRESS_PROVIDER})
    addressProvider.governor.returns(deployer.address)

    const priceProviderFactory = await ethers.getContractFactory('ChainlinkPriceProvider', deployer)
    priceProvider = await priceProviderFactory.deploy()
    await priceProvider.deployed()

    await priceProvider.updateAggregator(DAI, CHAINLINK_DAI_USD_AGGREGATOR)
    await priceProvider.updateAggregator(WETH, CHAINLINK_ETH_USD_AGGREGATOR)
    await priceProvider.updateAggregator(WBTC, CHAINLINK_BTC_USD_AGGREGATOR)
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('getPriceInUsd', function () {
    it('should WETH price', async function () {
      const {_priceInUsd} = await priceProvider.getPriceInUsd(WETH)
      expect(_priceInUsd).closeTo(Quote.mainnet.ETH_USD, parseEther('10'))
    })

    it('should WBTC price', async function () {
      const {_priceInUsd} = await priceProvider.getPriceInUsd(WBTC)
      expect(_priceInUsd).closeTo(Quote.mainnet.BTC_USD, parseEther('100'))
    })

    it('should DAI price', async function () {
      const {_priceInUsd} = await priceProvider.getPriceInUsd(DAI)
      expect(_priceInUsd).closeTo(parseEther('1'), parseEther('0.1'))
    })

    // Redstone push model
    it('should weETH price', async function () {
      await priceProvider.updateAggregator(WEETH, REDSTONE_WEETH_USD_AGGREGATOR)
      const {_priceInUsd} = await priceProvider.getPriceInUsd(WEETH)
      expect(_priceInUsd).closeTo(Quote.mainnet.ETH_USD, parseEther('150'))
    })
  })

  describe('updateAggregator', function () {
    it('should revert if not governor', async function () {
      const tx = priceProvider.connect(alice).updateAggregator(WETH, CHAINLINK_ETH_USD_AGGREGATOR)
      await expect(tx).revertedWith('not-governor')
    })

    it('should revert if token is null', async function () {
      const tx = priceProvider.updateAggregator(ethers.constants.AddressZero, CHAINLINK_ETH_USD_AGGREGATOR)
      await expect(tx).revertedWith('token-is-null')
    })

    it('should revert if using same aggregator as current', async function () {
      const tx = priceProvider.updateAggregator(WETH, CHAINLINK_ETH_USD_AGGREGATOR)
      await expect(tx).revertedWith('same-as-current')
    })

    it('should update aggregator', async function () {
      const before = await priceProvider.aggregators(WETH)
      expect(before).not.eq(ethers.constants.AddressZero)
      await priceProvider.updateAggregator(WETH, CHAINLINK_BTC_USD_AGGREGATOR)
      const after = await priceProvider.aggregators(WETH)
      expect(after).eq(CHAINLINK_BTC_USD_AGGREGATOR).not.eq(before)
    })

    it('should set aggregator to null', async function () {
      const before = await priceProvider.aggregators(WETH)
      expect(before).not.eq(ethers.constants.AddressZero)
      await priceProvider.updateAggregator(WETH, ethers.constants.AddressZero)
      const after = await priceProvider.aggregators(WETH)
      expect(after).eq(ethers.constants.AddressZero)
    })
  })
})
