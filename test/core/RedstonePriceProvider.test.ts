/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {RedstonePriceProvider} from '../../typechain-types'
import {Addresses} from '../../helpers/address'
import {increaseTime, timestampFromLatestBlock} from '../helpers'
import {smock} from '@defi-wonderland/smock'
import {WrapperBuilder} from '@redstone-finance/evm-connector'

const {USDC, WETH, WBTC} = Addresses.mainnet

const ETH_USD_FEED_ID = '0x4554480000000000000000000000000000000000000000000000000000000000'
const USDC_USD_FEED_ID = '0x5553444300000000000000000000000000000000000000000000000000000000'
const BTC_USD_FEED_ID = '0x4254430000000000000000000000000000000000000000000000000000000000'

describe('RedstonePriceProvider @mainnet', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let alice: SignerWithAddress
  let priceProvider: RedstonePriceProvider
  let forkTimestamp: number

  beforeEach(async function () {
    forkTimestamp = (await ethers.provider.getBlock('latest')).timestamp

    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer, alice] = await ethers.getSigners()

    const addressProvider = await smock.fake('AddressProviderMock', {address: Addresses.ADDRESS_PROVIDER})
    addressProvider.governor.returns(deployer.address)

    const priceProviderFactory = await ethers.getContractFactory('RedstonePriceProvider', deployer)
    priceProvider = await priceProviderFactory.deploy()
    await priceProvider.deployed()

    await priceProvider.updateFeedId(ETH_USD_FEED_ID, WETH)
    await priceProvider.updateFeedId(USDC_USD_FEED_ID, USDC)
    await priceProvider.updateFeedId(BTC_USD_FEED_ID, WBTC)

    // Change block time to current timestamp
    const currentTimestamp = parseInt((Date.now() / 1000).toFixed())
    const blockTimestamp = await timestampFromLatestBlock()
    const toIncrease = currentTimestamp - blockTimestamp
    await increaseTime(ethers.BigNumber.from(toIncrease))
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  it('getPriceInUsd', async function () {
    // given (cache is empty)
    await expect(priceProvider.getPriceInUsd(WETH)).revertedWith('price-too-behind')
    await expect(priceProvider.getPriceInUsd(WBTC)).revertedWith('price-too-behind')
    await expect(priceProvider.getPriceInUsd(USDC)).revertedWith('price-too-behind')

    // when (update cache)
    const wrappedPriceProvider = WrapperBuilder.wrap(priceProvider).usingDataService({
      dataPackagesIds: ['ETH', 'USDC', 'BTC'],
    })
    await wrappedPriceProvider.updatePrice([ETH_USD_FEED_ID, BTC_USD_FEED_ID, USDC_USD_FEED_ID])

    // then (get from cache)
    expect(await priceProvider.getPriceInUsd(WETH)).to.not.deep.eq([0, 0])
    expect(await priceProvider.getPriceInUsd(WBTC)).to.not.deep.eq([0, 0])
    expect(await priceProvider.getPriceInUsd(USDC)).to.not.deep.eq([0, 0])
  })

  describe('updateFeedId', function () {
    it('should revert if not governor', async function () {
      const tx = priceProvider.connect(alice).updateFeedId(ETH_USD_FEED_ID, WETH)
      await expect(tx).revertedWith('not-governor')
    })

    it('should revert if id is null', async function () {
      const zeroId = ethers.utils.hexZeroPad('0x', 32)
      const tx = priceProvider.updateFeedId(zeroId, WETH)
      await expect(tx).revertedWith('id-is-null')
    })

    it('should update feed id', async function () {
      const before = await priceProvider.feedIds(BTC_USD_FEED_ID)
      expect(before).not.eq(ethers.constants.AddressZero)
      await priceProvider.updateFeedId(BTC_USD_FEED_ID, WETH)
      const after = await priceProvider.feedIds(BTC_USD_FEED_ID)
      expect(after).eq(WETH).not.eq(before)
    })

    it('should set feed id to null', async function () {
      const before = await priceProvider.feedIds(BTC_USD_FEED_ID)
      expect(before).not.eq(ethers.constants.AddressZero)
      await priceProvider.updateFeedId(BTC_USD_FEED_ID, ethers.constants.AddressZero)
      const after = await priceProvider.feedIds(BTC_USD_FEED_ID)
      expect(after).eq(ethers.constants.AddressZero)
    })
  })
})
