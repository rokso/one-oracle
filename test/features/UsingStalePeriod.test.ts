/* eslint-disable camelcase */
import {smock} from '@defi-wonderland/smock'
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {Addresses} from '../../helpers'
import {UsingStalePeriodMock} from '../../typechain-types'
import {HOUR, timestampFromLatestBlock} from '../helpers'

const DEFAULT_STALE_PERIOD = HOUR

describe('UsingStalePeriod @mainnet', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let alice: SignerWithAddress
  let usingStalePeriod: UsingStalePeriodMock

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer, alice] = await ethers.getSigners()

    const addressProvider = await smock.fake('AddressProviderMock', {address: Addresses.ADDRESS_PROVIDER})
    addressProvider.governor.returns(deployer.address)

    const usingStalePeriodFactory = await ethers.getContractFactory('UsingStalePeriodMock', deployer)
    usingStalePeriod = await usingStalePeriodFactory.deploy(DEFAULT_STALE_PERIOD)
    await usingStalePeriod.deployed()
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('updateDefaultStalePeriod', function () {
    it('should revert if not governor', async function () {
      const tx = usingStalePeriod.connect(alice).updateDefaultStalePeriod(60)
      await expect(tx).revertedWith('not-governor')
    })

    it('should update default stale period', async function () {
      // given
      const before = await usingStalePeriod.defaultStalePeriod()
      expect(before).eq(DEFAULT_STALE_PERIOD)

      // when
      await usingStalePeriod.updateDefaultStalePeriod(1)

      // then
      const after = await usingStalePeriod.defaultStalePeriod()
      expect(after).eq(1)
    })
  })

  describe('updateCustomStalePeriod', function () {
    it('should revert if not governor', async function () {
      const tx = usingStalePeriod.connect(alice).updateCustomStalePeriod(ethers.constants.AddressZero, 60)
      await expect(tx).revertedWith('not-governor')
    })

    it('should revert if address is null', async function () {
      const tx = usingStalePeriod.updateCustomStalePeriod(ethers.constants.AddressZero, 60)
      await expect(tx).revertedWith('token-is-null')
    })

    it('should update stale period', async function () {
      // given
      const before = await usingStalePeriod.stalePeriodOf(Addresses.mainnet.USDT)
      expect(before).eq(DEFAULT_STALE_PERIOD)

      // when
      await usingStalePeriod.updateCustomStalePeriod(Addresses.mainnet.USDT, 1)

      // then
      const after = await usingStalePeriod.stalePeriodOf(Addresses.mainnet.USDT)
      expect(after).eq(1)
    })

    it('should clean stale period', async function () {
      // given
      await usingStalePeriod.updateCustomStalePeriod(Addresses.mainnet.USDT, 1)
      const before = await usingStalePeriod.stalePeriodOf(Addresses.mainnet.USDT)
      expect(before).eq(1)

      // when
      await usingStalePeriod.updateCustomStalePeriod(Addresses.mainnet.USDT, 0)

      // then
      const after = await usingStalePeriod.stalePeriodOf(Addresses.mainnet.USDT)
      expect(after).eq(DEFAULT_STALE_PERIOD)
    })
  })

  describe('_priceIsStale', function () {
    it('should return true if last update is too old', async function () {
      const lastTimestamp = await timestampFromLatestBlock()
      const lastUpdate = lastTimestamp - DEFAULT_STALE_PERIOD.add(1).toNumber()
      const isStale = await usingStalePeriod.priceIsStale(lastUpdate, DEFAULT_STALE_PERIOD)
      expect(isStale).true
    })

    it('should return false if it last update is recent', async function () {
      const lastTimestamp = await timestampFromLatestBlock()
      const lastUpdate = lastTimestamp - DEFAULT_STALE_PERIOD.sub(1).toNumber()
      const isStale = await usingStalePeriod.priceIsStale(lastUpdate, DEFAULT_STALE_PERIOD)
      expect(isStale).false
    })
  })
})
