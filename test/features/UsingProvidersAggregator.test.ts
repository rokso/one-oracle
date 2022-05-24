/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {UsingProvidersAggregatorMock, UsingProvidersAggregatorMock__factory} from '../../typechain-types'

describe('UsingProvidersAggregator @mainnet', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let governor: SignerWithAddress
  let providerAggregatorMock: SignerWithAddress
  let usingProvidersAggregator: UsingProvidersAggregatorMock

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer, governor, providerAggregatorMock] = await ethers.getSigners()

    const usingProvidersAggregatorFactory = new UsingProvidersAggregatorMock__factory(deployer)
    usingProvidersAggregator = await usingProvidersAggregatorFactory.deploy(providerAggregatorMock.address)
    await usingProvidersAggregator.deployed()
    await usingProvidersAggregator.transferGovernorship(governor.address)
    await usingProvidersAggregator.connect(governor).acceptGovernorship()
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('updateProvidersAggregator', function () {
    it('should revert if not governor', async function () {
      const tx = usingProvidersAggregator.updateProvidersAggregator(providerAggregatorMock.address)
      await expect(tx).revertedWith('not-governor')
    })

    it('should revert if setting null', async function () {
      const tx = usingProvidersAggregator.connect(governor).updateProvidersAggregator(ethers.constants.AddressZero)
      await expect(tx).revertedWith('address-is-null')
    })

    it('should update providers aggregator', async function () {
      // given
      const before = await usingProvidersAggregator.providersAggregator()
      expect(before).eq(providerAggregatorMock.address)

      // when
      await usingProvidersAggregator.connect(governor).updateProvidersAggregator(deployer.address)

      // then
      const after = await usingProvidersAggregator.providersAggregator()
      expect(after).eq(deployer.address)
    })
  })
})
