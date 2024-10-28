/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {IPyth, PythMainnetPriceProvider} from '../../typechain-types'
import {Addresses} from '../../helpers/address'
import {increaseTime, timestampFromLatestBlock} from '../helpers'
import {smock} from '@defi-wonderland/smock'
import {EvmPriceServiceConnection} from '@pythnetwork/pyth-evm-js'

const {USDC, WETH, WBTC, PYTH_ORACLE} = Addresses.mainnet

const ETH_USD_FEED_ID = '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace'
const USDC_USD_FEED_ID = '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a'
const BTC_USD_FEED_ID = '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43'

describe('PythPriceProvider @mainnet', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let alice: SignerWithAddress
  let pyth: IPyth
  let priceProvider: PythMainnetPriceProvider
  let forkTimestamp: number

  beforeEach(async function () {
    forkTimestamp = (await ethers.provider.getBlock('latest')).timestamp

    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer, alice] = await ethers.getSigners()

    pyth = await ethers.getContractAt('IPyth', PYTH_ORACLE)

    const addressProvider = await smock.fake('AddressProviderMock', {address: Addresses.ADDRESS_PROVIDER})
    addressProvider.governor.returns(deployer.address)

    const priceProviderFactory = await ethers.getContractFactory('PythMainnetPriceProvider', deployer)
    priceProvider = await priceProviderFactory.deploy(pyth.address)
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
    // given (prices outdated)
    expect(await priceProvider.getPriceInUsd(WETH)).to.deep.eq([0, 0])
    expect(await priceProvider.getPriceInUsd(WBTC)).to.deep.eq([0, 0])
    expect(await priceProvider.getPriceInUsd(USDC)).to.deep.eq([0, 0])

    // when (update prices)
    const connection = new EvmPriceServiceConnection('https://hermes.pyth.network')
    const priceIds = [BTC_USD_FEED_ID, ETH_USD_FEED_ID, USDC_USD_FEED_ID]
    const priceUpdate = await connection.getPriceFeedsUpdateData(priceIds)
    const fee = await pyth.getUpdateFee(priceIds)
    await pyth.updatePriceFeeds(priceUpdate, {value: fee})

    // then
    expect(await priceProvider.getPriceInUsd(WETH)).to.not.deep.eq([0, 0])
    expect(await priceProvider.getPriceInUsd(WBTC)).to.not.deep.eq([0, 0])
    expect(await priceProvider.getPriceInUsd(USDC)).to.not.deep.eq([0, 0])
  })

  describe('updateFeedId', function () {
    it('should revert if not governor', async function () {
      const tx = priceProvider.connect(alice).updateFeedId(WETH, ETH_USD_FEED_ID)
      await expect(tx).revertedWith('not-governor')
    })

    it('should revert if token is null', async function () {
      const tx = priceProvider.updateFeedId(ethers.constants.AddressZero, ETH_USD_FEED_ID)
      await expect(tx).revertedWith('token-is-null')
    })

    it('should update aggregator', async function () {
      const before = await priceProvider.feedIds(WETH)
      expect(before).not.eq(ethers.constants.AddressZero)
      await priceProvider.updateFeedId(WETH, BTC_USD_FEED_ID)
      const after = await priceProvider.feedIds(WETH)
      expect(after).eq(BTC_USD_FEED_ID).not.eq(before)
    })

    it('should set aggregator to null', async function () {
      const zeroId = ethers.utils.hexZeroPad('0x', 32)
      const before = await priceProvider.feedIds(WETH)
      expect(before).not.eq(ethers.constants.AddressZero)
      await priceProvider.updateFeedId(WETH, zeroId)
      const after = await priceProvider.feedIds(WETH)
      expect(after).eq(zeroId)
    })
  })
})
