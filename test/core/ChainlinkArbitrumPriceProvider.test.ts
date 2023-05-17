/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {ChainlinkArbitrumPriceProvider} from '../../typechain-types'
import {Addresses} from '../../helpers/address'
import {parseEther} from '../helpers'
import Quote from '../helpers/quotes'

const {DAI, WETH} = Addresses.arbitrum

describe('ChainlinkArbitrumPriceProvider @arbitrum', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let priceProvider: ChainlinkArbitrumPriceProvider

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer] = await ethers.getSigners()

    const priceProviderFactory = await ethers.getContractFactory('ChainlinkArbitrumPriceProvider', deployer)
    priceProvider = await priceProviderFactory.deploy()
    await priceProvider.deployed()
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('quote', function () {
    it('should quote WETH to DAI', async function () {
      const {_amountOut} = await priceProvider.quote(WETH, DAI, parseEther('1'))
      expect(_amountOut).closeTo(Quote.arbitrum.ETH_USD, parseEther('1'))
    })
  })
})
