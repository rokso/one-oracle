/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {ChainlinkPolygonPriceProvider, ChainlinkPolygonPriceProvider__factory} from '../../typechain-types'
import Address from '../../helpers/address'
import {parseEther} from '../helpers'

const {DAI_ADDRESS, WETH_ADDRESS} = Address.polygon

describe('ChainlinkPolygonPriceProvider @polygon', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let priceProvider: ChainlinkPolygonPriceProvider

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer] = await ethers.getSigners()

    const priceProviderFactory = new ChainlinkPolygonPriceProvider__factory(deployer)
    priceProvider = await priceProviderFactory.deploy()
    await priceProvider.deployed()
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('quote', function () {
    it('should quote WETH to DAI', async function () {
      const {_amountOut} = await priceProvider.quote(WETH_ADDRESS, DAI_ADDRESS, parseEther('1'))
      expect(_amountOut).closeTo(parseEther('3,013'), parseEther('1'))
    })
  })
})
