/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {ChainlinkArbitrumPriceProvider, ChainlinkArbitrumPriceProvider__factory} from '../../typechain-types'
import Address from '../../helpers/address'
import {parseEther} from '../helpers'

const {DAI, WETH} = Address.arbitrum

describe('ChainlinkArbitrumPriceProvider @arbitrum', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let priceProvider: ChainlinkArbitrumPriceProvider

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer] = await ethers.getSigners()

    const priceProviderFactory = new ChainlinkArbitrumPriceProvider__factory(deployer)
    priceProvider = await priceProviderFactory.deploy()
    await priceProvider.deployed()
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('quote', function () {
    it('should quote WETH to DAI', async function () {
      const {_amountOut} = await priceProvider.quote(WETH, DAI, parseEther('1'))
      expect(_amountOut).closeTo(parseEther('3,020'), parseEther('1'))
    })
  })
})
