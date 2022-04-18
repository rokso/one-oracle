/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {
  ChainlinkPolygonPriceProvider,
  ChainlinkPolygonPriceProvider__factory,
  IERC20,
  IERC20__factory,
} from '../typechain-types'
import Address from '../helpers/address'
import {parseEther, parseUnits} from './helpers'

const {DAI_ADDRESS, WETH_ADDRESS, WBTC_ADDRESS} = Address.polygon

describe('ChainlinkPolygonPriceProvider @polygon', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let priceProvider: ChainlinkPolygonPriceProvider
  let dai: IERC20
  let weth: IERC20
  let wbtc: IERC20

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer] = await ethers.getSigners()

    dai = IERC20__factory.connect(DAI_ADDRESS, deployer)
    weth = IERC20__factory.connect(WETH_ADDRESS, deployer)
    wbtc = IERC20__factory.connect(WBTC_ADDRESS, deployer)

    const priceProviderFactory = new ChainlinkPolygonPriceProvider__factory(deployer)
    priceProvider = await priceProviderFactory.deploy()
    await priceProvider.deployed()
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('quote', function () {
    it('should quote WETH to DAI', async function () {
      const {_amountOut} = await priceProvider.quote(weth.address, dai.address, parseEther('1'))
      expect(_amountOut).closeTo(parseEther('3,013'), parseEther('1'))
    })
  })

  describe('quoteTokenToUsd', function () {
    it('should quote WETH to USD', async function () {
      const {_amountOut} = await priceProvider.quoteTokenToUsd(weth.address, parseEther('1'))
      expect(_amountOut).closeTo(parseEther('3,014'), parseEther('1'))
    })
  })

  describe('quoteUsdToToken', function () {
    it('should quote USD to WBTC', async function () {
      const {_amountOut} = await priceProvider.quoteUsdToToken(wbtc.address, parseEther('43,675'))
      expect(_amountOut).closeTo(parseUnits('1', 8), parseEther('0.1'))
    })
  })
})
