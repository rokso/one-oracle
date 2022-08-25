/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {ChainlinkPriceProvider, ChainlinkPriceProvider__factory} from '../../typechain-types'
import Address from '../../helpers/address'
import {parseEther} from '../helpers'
import {smock} from '@defi-wonderland/smock'

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
  let alice: SignerWithAddress
  let priceProvider: ChainlinkPriceProvider

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer, alice] = await ethers.getSigners()

    const addressProvider = await smock.fake('AddressProvider', {address: Address.ADDRESS_PROVIDER})
    addressProvider.governor.returns(deployer.address)

    const priceProviderFactory = new ChainlinkPriceProvider__factory(deployer)
    priceProvider = await priceProviderFactory.deploy()
    await priceProvider.deployed()

    await priceProvider.updateAggregator(DAI_ADDRESS, CHAINLINK_DAI_USD_AGGREGATOR)
    await priceProvider.updateAggregator(WETH_ADDRESS, CHAINLINK_ETH_USD_AGGREGATOR)
    await priceProvider.updateAggregator(WBTC_ADDRESS, CHAINLINK_BTC_USD_AGGREGATOR)
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

  describe('updateAggregator', function () {
    it('should revert if not governor', async function () {
      const tx = priceProvider.connect(alice).updateAggregator(WETH_ADDRESS, CHAINLINK_ETH_USD_AGGREGATOR)
      await expect(tx).revertedWith('not-governor')
    })

    it('should revert if token is null', async function () {
      const tx = priceProvider.updateAggregator(ethers.constants.AddressZero, CHAINLINK_ETH_USD_AGGREGATOR)
      await expect(tx).revertedWith('token-is-null')
    })

    it('should revert if using same aggregator as current', async function () {
      const tx = priceProvider.updateAggregator(WETH_ADDRESS, CHAINLINK_ETH_USD_AGGREGATOR)
      await expect(tx).revertedWith('same-as-current')
    })

    it('should update aggregator', async function () {
      const before = await priceProvider.aggregators(WETH_ADDRESS)
      expect(before).not.eq(ethers.constants.AddressZero)
      await priceProvider.updateAggregator(WETH_ADDRESS, CHAINLINK_BTC_USD_AGGREGATOR)
      const after = await priceProvider.aggregators(WETH_ADDRESS)
      expect(after).eq(CHAINLINK_BTC_USD_AGGREGATOR).not.eq(before)
    })

    it('should set aggregator to null', async function () {
      const before = await priceProvider.aggregators(WETH_ADDRESS)
      expect(before).not.eq(ethers.constants.AddressZero)
      await priceProvider.updateAggregator(WETH_ADDRESS, ethers.constants.AddressZero)
      const after = await priceProvider.aggregators(WETH_ADDRESS)
      expect(after).eq(ethers.constants.AddressZero)
    })
  })
})
