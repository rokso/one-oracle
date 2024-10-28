/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {RedstoneMainnetPriceProvider} from '../../typechain-types'
import {Addresses} from '../../helpers/address'
import {increaseTime, timestampFromLatestBlock} from '../helpers'
import {smock} from '@defi-wonderland/smock'
import {WrapperBuilder} from '@redstone-finance/evm-connector'

const {USDC, WETH, WBTC} = Addresses.mainnet

const ETH_USD_FEED_ID = ethers.utils.formatBytes32String('ETH') // i.e., bytes32("ETH")
const USDC_USD_FEED_ID = ethers.utils.formatBytes32String('USDC') // i.e., bytes32("USDC")
const BTC_USD_FEED_ID = ethers.utils.formatBytes32String('BTC') // i.e., bytes32("BTC")

describe('RedstonePriceProvider @mainnet', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let alice: SignerWithAddress
  let priceProvider: RedstoneMainnetPriceProvider
  let forkTimestamp: number

  beforeEach(async function () {
    forkTimestamp = (await ethers.provider.getBlock('latest')).timestamp

    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer, alice] = await ethers.getSigners()

    const addressProvider = await smock.fake('AddressProviderMock', {address: Addresses.ADDRESS_PROVIDER})
    addressProvider.governor.returns(deployer.address)

    const priceProviderFactory = await ethers.getContractFactory('RedstoneMainnetPriceProvider', deployer)
    priceProvider = await priceProviderFactory.deploy()
    await priceProvider.deployed()

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
    expect(await priceProvider.getPriceInUsd(WETH)).to.deep.eq([0, 0])
    expect(await priceProvider.getPriceInUsd(WBTC)).to.deep.eq([0, 0])
    expect(await priceProvider.getPriceInUsd(USDC)).to.deep.eq([0, 0])

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

  describe('updateFeed', function () {
    it('should revert if not governor', async function () {
      const tx = priceProvider.connect(alice).updateFeed(ETH_USD_FEED_ID, [WETH])
      await expect(tx).revertedWith('not-governor')
    })

    it('should revert if id is null', async function () {
      const zeroId = ethers.utils.hexZeroPad('0x', 32)
      const tx = priceProvider.updateFeed(zeroId, [WETH])
      await expect(tx).revertedWith('id-is-null')
    })

    it('should update feed id', async function () {
      const [before] = await priceProvider.tokensOf(BTC_USD_FEED_ID)
      expect(before).not.eq(ethers.constants.AddressZero)
      await priceProvider.updateFeed(BTC_USD_FEED_ID, [WETH])
      const [after] = await priceProvider.tokensOf(BTC_USD_FEED_ID)
      expect(after).eq(WETH).not.eq(before)
    })

    it('should set feed id to null', async function () {
      const [before] = await priceProvider.tokensOf(BTC_USD_FEED_ID)
      expect(before).not.eq(ethers.constants.AddressZero)
      await priceProvider.updateFeed(BTC_USD_FEED_ID, [ethers.constants.AddressZero])
      const [after] = await priceProvider.tokensOf(BTC_USD_FEED_ID)
      expect(after).eq(ethers.constants.AddressZero)
    })
  })
})
