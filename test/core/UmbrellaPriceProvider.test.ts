/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {UmbrellaPriceProvider} from '../../typechain-types'
import {Addresses} from '../../helpers/address'
import {parseEther} from '../helpers'
import {encodeKey} from '../helpers/umbrella'
import {smock} from '@defi-wonderland/smock'
import Quote from '../helpers/quotes'

const {
  DAI,
  WETH,
  WBTC,
  Compound: {CDAI},
  Umbrella: {UMB_ADDRESS, UMBRELLA_REGISTRY},
} = Addresses.mainnet

describe('UmbrellaPriceProvider @mainnet', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let alice: SignerWithAddress
  let priceProvider: UmbrellaPriceProvider

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer, alice] = await ethers.getSigners()

    const addressProvider = await smock.fake('AddressProviderMock', {address: Addresses.ADDRESS_PROVIDER})
    addressProvider.governor.returns(deployer.address)

    const priceProviderFactory = await ethers.getContractFactory('UmbrellaPriceProvider', deployer)
    priceProvider = await priceProviderFactory.deploy(UMBRELLA_REGISTRY)
    await priceProvider.deployed()

    await priceProvider.updateKeyOfToken(WETH, 'ETH-USD')
    await priceProvider.updateKeyOfToken(WBTC, 'BTC-USD')
    await priceProvider.updateKeyOfToken(DAI, 'DAI-USD')
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('getPriceInUsd', function () {
    // Note: price is outdated
    it.skip('should WETH price', async function () {
      const {_priceInUsd} = await priceProvider.getPriceInUsd(WETH)
      expect(_priceInUsd).closeTo(Quote.mainnet.ETH_USD, parseEther('1'))
    })

    // Note: price is outdated
    it.skip('should WBTC price', async function () {
      const {_priceInUsd} = await priceProvider.getPriceInUsd(WBTC)
      expect(_priceInUsd).closeTo(Quote.mainnet.BTC_USD, parseEther('1'))
    })

    it('should revert if token is not supported', async function () {
      const tx = priceProvider.getPriceInUsd(CDAI)
      await expect(tx).revertedWith('invalid-quote')
    })
  })

  describe('updateKeyOfToken', function () {
    it('should revert if not governor', async function () {
      const tx = priceProvider.connect(alice).updateKeyOfToken(WBTC, 'BTC-USD')
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
