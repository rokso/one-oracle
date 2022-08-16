/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {UsingStalePeriodMock, UsingStalePeriodMock__factory} from '../../typechain-types'
import {HOUR, timestampFromLatestBlock} from '../helpers'

const STALE_PERIOD = HOUR

describe('UsingStalePeriod @mainnet', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let alice: SignerWithAddress
  let usingStalePeriod: UsingStalePeriodMock

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer, alice] = await ethers.getSigners()

    const usingStalePeriodFactory = new UsingStalePeriodMock__factory(deployer)
    usingStalePeriod = await usingStalePeriodFactory.deploy(STALE_PERIOD)
    await usingStalePeriod.deployed()
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('updateStalePeriod', function () {
    it('should revert if not governor', async function () {
      const tx = usingStalePeriod.connect(alice).updateStalePeriod(60)
      await expect(tx).revertedWith('not-governor')
    })

    it('should update stale period', async function () {
      // given
      const before = await usingStalePeriod.stalePeriod()
      expect(before).eq(STALE_PERIOD)

      // when
      await usingStalePeriod.updateStalePeriod(1)

      // then
      const after = await usingStalePeriod.stalePeriod()
      expect(after).eq(1)
    })
  })

  describe('_priceIsStale', function () {
    it('should return true if last update is too old', async function () {
      const lastTimestamp = await timestampFromLatestBlock()
      const lastUpdate = lastTimestamp - STALE_PERIOD.add(1).toNumber()
      const isStale = await usingStalePeriod.priceIsStale(lastUpdate, STALE_PERIOD)
      expect(isStale).true
    })

    it('should return false if it last update is recent', async function () {
      const lastTimestamp = await timestampFromLatestBlock()
      const lastUpdate = lastTimestamp - STALE_PERIOD.sub(1).toNumber()
      const isStale = await usingStalePeriod.priceIsStale(lastUpdate, STALE_PERIOD)
      expect(isStale).false
    })
  })
})
