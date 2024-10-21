/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {IPyth, PythPriceProvider} from '../../typechain-types'
import {Addresses} from '../../helpers/address'
import {parseEther} from '../helpers'
import {smock} from '@defi-wonderland/smock'
import {EvmPriceServiceConnection} from '@pythnetwork/pyth-evm-js'

const {USDC, WETH, WBTC, PYTH_ORACLE} = Addresses.mainnet

const ETH_USD_FEED_ID = '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace'
const USDC_USD_FEED_ID = '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a'
const BTC_USD_FEED_ID = '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43'

const TOO_LONG = 60 * 60 * 20

describe('PythPriceProvider @mainnet', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let alice: SignerWithAddress
  let pyth: IPyth
  let priceProvider: PythPriceProvider
  let forkTimestamp: number

  beforeEach(async function () {
    forkTimestamp = (await ethers.provider.getBlock('latest')).timestamp

    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer, alice] = await ethers.getSigners()

    pyth = await ethers.getContractAt('IPyth', PYTH_ORACLE)

    const addressProvider = await smock.fake('AddressProviderMock', {address: Addresses.ADDRESS_PROVIDER})
    addressProvider.governor.returns(deployer.address)

    const priceProviderFactory = await ethers.getContractFactory('PythPriceProvider', deployer)
    priceProvider = await priceProviderFactory.deploy(pyth.address)
    await priceProvider.deployed()

    await priceProvider.updateFeedId(WETH, ETH_USD_FEED_ID)
    await priceProvider.updateFeedId(USDC, USDC_USD_FEED_ID)
    await priceProvider.updateFeedId(WBTC, BTC_USD_FEED_ID)
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('getPriceInUsd', function () {
    it('should WETH price', async function () {
      const {_priceInUsd, _lastUpdatedAt} = await priceProvider.getPriceInUsd(WETH)

      expect(_lastUpdatedAt).lt(forkTimestamp - TOO_LONG)
      expect(_priceInUsd).closeTo(parseEther('2,460'), parseEther('10'))
      // Note: Pyth price is outdated compared with current forked block
      // expect(_priceInUsd).closeTo(Quote.mainnet.ETH_USD, parseEther('100'))
    })

    it('should WBTC price', async function () {
      const {_priceInUsd, _lastUpdatedAt} = await priceProvider.getPriceInUsd(WBTC)
      expect(_lastUpdatedAt).lt(forkTimestamp - TOO_LONG)
      expect(_priceInUsd).closeTo(parseEther('62,654'), parseEther('100'))
      // Note: Pyth price is outdated compared with current forked block
      // expect(_priceInUsd).closeTo(Quote.mainnet.BTC_USD, parseEther('100'))
    })

    it('should USDC price', async function () {
      const {_priceInUsd} = await priceProvider.getPriceInUsd(USDC)
      expect(_priceInUsd).closeTo(parseEther('1'), parseEther('0.1'))
    })
  })

  describe('update Pyth prices', function () {
    it('should update price', async function () {
      // given
      const {_priceInUsd} = await priceProvider.getPriceInUsd(WBTC)
      expect(_priceInUsd).closeTo(parseEther('62,654'), parseEther('100'))

      // when
      const connection = new EvmPriceServiceConnection('https://hermes.pyth.network')
      const priceIds = [BTC_USD_FEED_ID]
      const priceUpdate = await connection.getPriceFeedsUpdateData(priceIds)
      const fee = await pyth.getUpdateFee(priceIds)
      await pyth.updatePriceFeeds(priceUpdate, {value: fee})

      // then
      const tx = priceProvider.getPriceInUsd(WBTC)
      await expect(tx).revertedWith('price-too-ahead')
    })
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
