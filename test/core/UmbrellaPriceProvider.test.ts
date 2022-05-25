/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {UmbrellaPriceProvider, UmbrellaPriceProvider__factory} from '../../typechain-types'
import Address from '../../helpers/address'
import {parseEther} from '../helpers'

const {DAI_ADDRESS, WETH_ADDRESS, WBTC_ADDRESS, CDAI_ADDRESS, UMBRELLA_REGISTRY} = Address.mainnet

describe('UmbrellaPriceProvider @mainnet', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let governor: SignerWithAddress
  let priceProvider: UmbrellaPriceProvider

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer, governor] = await ethers.getSigners()

    const priceProviderFactory = new UmbrellaPriceProvider__factory(deployer)
    priceProvider = await priceProviderFactory.deploy(UMBRELLA_REGISTRY)
    await priceProvider.deployed()
    await priceProvider.transferGovernorship(governor.address)
    await priceProvider.connect(governor).acceptGovernorship()
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('getPriceInUsd', function () {
    it('should revert if token is invalid', async function () {
      const tx = priceProvider.quote(WETH_ADDRESS, ethers.constants.AddressZero, parseEther('1'))
      await expect(tx).revertedWith('invalid-token')
    })

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
})
