/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {UmbrellaPriceProvider, UmbrellaPriceProvider__factory} from '../../typechain-types'
import Address from '../../helpers/address'
import {parseEther} from '../helpers'
import {encodeKey} from '../helpers/umbrella'

const {DAI_ADDRESS, WETH_ADDRESS, WBTC_ADDRESS, CDAI_ADDRESS, UMB_ADDRESS, UMBRELLA_REGISTRY} = Address.mainnet

describe('UmbrellaPriceProvider @mainnet', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let alice: SignerWithAddress
  let priceProvider: UmbrellaPriceProvider

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer, alice] = await ethers.getSigners()

    const priceProviderFactory = new UmbrellaPriceProvider__factory(deployer)
    priceProvider = await priceProviderFactory.deploy(UMBRELLA_REGISTRY)
    await priceProvider.deployed()

    await priceProvider.updateKeyOfToken(WETH_ADDRESS, 'ETH-USD')
    await priceProvider.updateKeyOfToken(WBTC_ADDRESS, 'BTC-USD')
    await priceProvider.updateKeyOfToken(DAI_ADDRESS, 'DAI-USD')
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('getPriceInUsd', function () {
    it('should WETH price', async function () {
      const {_priceInUsd} = await priceProvider.getPriceInUsd(WETH_ADDRESS)
      expect(_priceInUsd).closeTo(parseEther('3,231'), parseEther('1'))
    })

    it('should WBTC price', async function () {
      const {_priceInUsd} = await priceProvider.getPriceInUsd(WBTC_ADDRESS)
      expect(_priceInUsd).closeTo(parseEther('43,613'), parseEther('1'))
    })

    it('should DAI price', async function () {
      const {_priceInUsd} = await priceProvider.getPriceInUsd(DAI_ADDRESS)
      expect(_priceInUsd).closeTo(parseEther('1'), parseEther('0.1'))
    })

    it('should revert if token is not supported', async function () {
      const tx = priceProvider.getPriceInUsd(CDAI_ADDRESS)
      await expect(tx).revertedWith('invalid-quote')
    })
  })

  describe('updateKeyOfToken', function () {
    it('should revert if not governor', async function () {
      const tx = priceProvider.connect(alice).updateKeyOfToken(WBTC_ADDRESS, 'BTC-USD')
      await expect(tx).revertedWith('not-governor')
    })

    it('should revert if token is null', async function () {
      const tx = priceProvider.updateKeyOfToken(ethers.constants.AddressZero, 'BTC-USD')
      await expect(tx).revertedWith('address-is-null')
    })

    it('should update key', async function () {
      // given
      const before = await priceProvider.keyOfToken(UMB_ADDRESS)
      expect(before).eq(ethers.utils.formatBytes32String(''))

      // when
      await priceProvider.updateKeyOfToken(UMB_ADDRESS, 'UMB-USD')

      // then
      const after = await priceProvider.keyOfToken(UMB_ADDRESS)
      expect(after).eq(encodeKey('UMB-USD'))
    })
  })
})
