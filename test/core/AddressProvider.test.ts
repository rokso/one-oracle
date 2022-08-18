/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {AddressProvider, AddressProvider__factory} from '../../typechain-types'

describe('AddressProvider @mainnet', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let governor: SignerWithAddress
  let providerAggregatorMock: SignerWithAddress
  let stableCoinProviderMock: SignerWithAddress
  let addressProvider: AddressProvider

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer, governor, providerAggregatorMock, stableCoinProviderMock] = await ethers.getSigners()

    const addressProviderFactory = new AddressProvider__factory(deployer)
    addressProvider = await addressProviderFactory.deploy()
    await addressProvider.deployed()
    await addressProvider.initialize(governor.address)
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('updateProvidersAggregator', function () {
    it('should revert if not governor', async function () {
      const tx = addressProvider.updateProvidersAggregator(providerAggregatorMock.address)
      await expect(tx).revertedWith('not-governor')
    })

    it('should revert if setting null', async function () {
      const tx = addressProvider.connect(governor).updateProvidersAggregator(ethers.constants.AddressZero)
      await expect(tx).revertedWith('address-is-null')
    })

    it('should update providers aggregator', async function () {
      // given
      const before = await addressProvider.providersAggregator()
      expect(before).eq(ethers.constants.AddressZero)

      // when
      await addressProvider.connect(governor).updateProvidersAggregator(providerAggregatorMock.address)

      // then
      const after = await addressProvider.providersAggregator()
      expect(after).eq(providerAggregatorMock.address)
    })
  })

  describe('updateStableCoinProvider', function () {
    it('should revert if not governor', async function () {
      const tx = addressProvider.updateStableCoinProvider(stableCoinProviderMock.address)
      await expect(tx).revertedWith('not-governor')
    })

    it('should update stable coin provider', async function () {
      // given
      const before = await addressProvider.stableCoinProvider()
      expect(before).eq(ethers.constants.AddressZero)

      // when
      await addressProvider.connect(governor).updateStableCoinProvider(stableCoinProviderMock.address)

      // then
      const after = await addressProvider.stableCoinProvider()
      expect(after).eq(stableCoinProviderMock.address)
    })
  })
})
