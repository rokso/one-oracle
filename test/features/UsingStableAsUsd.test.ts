/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {UsingStableAsUsdMock, UsingStableAsUsdMock__factory} from '../../typechain-types'
import Address from '../../helpers/address'

const {DAI_ADDRESS, USDC_ADDRESS} = Address.mainnet

describe('UsingStableAsUsd @mainnet', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let governor: SignerWithAddress
  let usingStableAsUsd: UsingStableAsUsdMock

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer, governor] = await ethers.getSigners()

    const usingStableAsUsdFactory = new UsingStableAsUsdMock__factory(deployer)
    usingStableAsUsd = await usingStableAsUsdFactory.deploy(USDC_ADDRESS)
    await usingStableAsUsd.deployed()
    await usingStableAsUsd.transferGovernorship(governor.address)
    await usingStableAsUsd.connect(governor).acceptGovernorship()
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('updateStableCoin', function () {
    it('should revert if not governor', async function () {
      const tx = usingStableAsUsd.updateStableCoin(USDC_ADDRESS)
      await expect(tx).revertedWith('not-governor')
    })

    it('should update USD token', async function () {
      // given
      const before = await usingStableAsUsd.stableCoin()
      expect(before).eq(USDC_ADDRESS)

      // when
      await usingStableAsUsd.connect(governor).updateStableCoin(DAI_ADDRESS)

      // then
      const after = await usingStableAsUsd.stableCoin()
      expect(after).eq(DAI_ADDRESS)
    })
  })
})
