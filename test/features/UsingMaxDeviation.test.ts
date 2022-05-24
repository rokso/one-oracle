/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {UsingMaxDeviationMock, UsingMaxDeviationMock__factory} from '../../typechain-types'

import {parseEther} from '../helpers'

const MAX_DEVIATION = parseEther('0.01') // 1%

describe('UsingMaxDeviation @mainnet', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let governor: SignerWithAddress
  let usingMaxDeviation: UsingMaxDeviationMock

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer, governor] = await ethers.getSigners()

    const usingMaxDeviationFactory = new UsingMaxDeviationMock__factory(deployer)
    usingMaxDeviation = await usingMaxDeviationFactory.deploy(MAX_DEVIATION)
    await usingMaxDeviation.deployed()
    await usingMaxDeviation.transferGovernorship(governor.address)
    await usingMaxDeviation.connect(governor).acceptGovernorship()
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('updateMaxDeviation', function () {
    it('should revert if not governor', async function () {
      const tx = usingMaxDeviation.updateMaxDeviation(0)
      await expect(tx).revertedWith('not-governor')
    })

    it('should update max deviation', async function () {
      // given
      const before = await usingMaxDeviation.maxDeviation()
      expect(before).not.eq(ethers.constants.AddressZero)

      // when
      const maxDeviation = MAX_DEVIATION.mul(2)
      await usingMaxDeviation.connect(governor).updateMaxDeviation(maxDeviation)

      // then
      const after = await usingMaxDeviation.maxDeviation()
      expect(after).eq(maxDeviation).not.eq(before)
    })
  })

  describe('_isDeviationOK', function () {
    it('should return true if it is OK', async function () {
      const ok = await usingMaxDeviation.isDeviationOK(parseEther('1000'), parseEther('1009')) // 0.9%
      expect(ok).true
    })

    it('should return false if it is too high', async function () {
      const ok = await usingMaxDeviation.isDeviationOK(parseEther('1000'), parseEther('1011')) // 1.1%
      expect(ok).false
    })
  })
})
