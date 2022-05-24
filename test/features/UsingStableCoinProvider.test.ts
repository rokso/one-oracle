/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {UsingStableCoinProviderMock, UsingStableCoinProviderMock__factory} from '../../typechain-types'

describe('UsingStableCoinProvider @mainnet', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let governor: SignerWithAddress
  let stableCoinProviderMock: SignerWithAddress
  let usingStableCoinProvider: UsingStableCoinProviderMock

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer, governor, stableCoinProviderMock] = await ethers.getSigners()

    const usingStableCoinProviderFactory = new UsingStableCoinProviderMock__factory(deployer)
    usingStableCoinProvider = await usingStableCoinProviderFactory.deploy(stableCoinProviderMock.address)
    await usingStableCoinProvider.deployed()
    await usingStableCoinProvider.transferGovernorship(governor.address)
    await usingStableCoinProvider.connect(governor).acceptGovernorship()
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('updateStableCoinProvider', function () {
    it('should revert if not governor', async function () {
      const tx = usingStableCoinProvider.updateStableCoinProvider(stableCoinProviderMock.address)
      await expect(tx).revertedWith('not-governor')
    })

    it('should update stable coin provider', async function () {
      // given
      const before = await usingStableCoinProvider.stableCoinProvider()
      expect(before).eq(stableCoinProviderMock.address)

      // when
      await usingStableCoinProvider.connect(governor).updateStableCoinProvider(deployer.address)

      // then
      const after = await usingStableCoinProvider.stableCoinProvider()
      expect(after).eq(deployer.address)
    })
  })
})
