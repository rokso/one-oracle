/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {ChainlinkAvalanchePriceProvider, ChainlinkAvalanchePriceProvider__factory} from '../../typechain-types'
import Address from '../../helpers/address'
import {parseEther} from '../helpers'
import Quote from '../helpers/quotes'

const {DAI, WETH} = Address.avalanche

describe('ChainlinkAvalanchePriceProvider @avalanche', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let priceProvider: ChainlinkAvalanchePriceProvider

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer] = await ethers.getSigners()

    const priceProviderFactory = new ChainlinkAvalanchePriceProvider__factory(deployer)
    priceProvider = await priceProviderFactory.deploy()
    await priceProvider.deployed()
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('quote', function () {
    it('should quote WETH to DAI', async function () {
      const {_amountOut} = await priceProvider.quote(WETH, DAI, parseEther('1'))
      expect(_amountOut).closeTo(Quote.avalanche.ETH_USD, parseEther('1'))
    })
  })
})
