/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {ChainlinkMainnetPriceProvider, ChainlinkMainnetPriceProvider__factory} from '../../typechain-types'
import Address from '../../helpers/address'
import {parseEther, parseUnits} from '../helpers'

const {DAI_ADDRESS, WETH_ADDRESS, WBTC_ADDRESS} = Address.mainnet

describe('ChainlinkMainnetPriceProvider @mainnet', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let priceProvider: ChainlinkMainnetPriceProvider

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer] = await ethers.getSigners()

    const priceProviderFactory = new ChainlinkMainnetPriceProvider__factory(deployer)
    priceProvider = await priceProviderFactory.deploy()
    await priceProvider.deployed()
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('quote', function () {
    it('should revert if aggregator does not exist', async function () {
      const tx = priceProvider.quote(WETH_ADDRESS, ethers.constants.AddressZero, parseEther('1'))
      await expect(tx).revertedWith('token-without-aggregator')
    })

    it('should quote same token to same token', async function () {
      const amountIn = parseEther('100')
      const {_amountOut} = await priceProvider.quote(WETH_ADDRESS, WETH_ADDRESS, amountIn)
      expect(_amountOut).eq(amountIn)
    })

    it('should quote 1 WETH to DAI', async function () {
      const {_amountOut} = await priceProvider.quote(WETH_ADDRESS, DAI_ADDRESS, parseEther('1'))
      expect(_amountOut).closeTo(parseEther('3,235'), parseEther('1'))
    })

    it('should quote 1 WBTC to DAI', async function () {
      const {_amountOut} = await priceProvider.quote(WBTC_ADDRESS, DAI_ADDRESS, parseUnits('1', 8))
      expect(_amountOut).closeTo(parseEther('43,666'), parseEther('1'))
    })

    it('should quote 1 WBTC to WETH', async function () {
      const {_amountOut} = await priceProvider.quote(WBTC_ADDRESS, WETH_ADDRESS, parseUnits('1', 8))
      expect(_amountOut).closeTo(parseEther('13'), parseEther('1'))
    })

    it('should quote 1 DAI to WETH', async function () {
      const {_amountOut} = await priceProvider.quote(DAI_ADDRESS, WETH_ADDRESS, parseEther('1'))
      expect(_amountOut).closeTo(parseEther('0.0003'), parseEther('0.0001'))
    })

    it('should quote 1 DAI to WBTC', async function () {
      const {_amountOut} = await priceProvider.quote(DAI_ADDRESS, WBTC_ADDRESS, parseEther('1'))
      expect(_amountOut).closeTo(parseUnits('0.00002', 8), parseUnits('0.00001', 8))
    })
  })
})
