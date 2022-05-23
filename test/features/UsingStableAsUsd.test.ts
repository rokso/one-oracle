/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {UsingStableAsUsdMock, UsingStableAsUsdMock__factory} from '../../typechain-types'
import Address from '../../helpers/address'
import {HOUR, parseEther, parseUnits, timestampFromLatestBlock, toUSD} from '../helpers'
import {FakeContract, smock} from '@defi-wonderland/smock'

const STALE_PERIOD = HOUR
const MAX_DEVIATION = parseEther('0.1') // 10%
const {DAI_ADDRESS, USDC_ADDRESS, USDT_ADDRESS} = Address.mainnet

describe('UsingStableAsUsd @mainnet', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let governor: SignerWithAddress
  let usingStableAsUsd: UsingStableAsUsdMock
  let priceProvider: FakeContract

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer, governor] = await ethers.getSigners()

    const usingStableAsUsdFactory = new UsingStableAsUsdMock__factory(deployer)
    usingStableAsUsd = await usingStableAsUsdFactory.deploy(DAI_ADDRESS, USDC_ADDRESS, MAX_DEVIATION, STALE_PERIOD)
    await usingStableAsUsd.deployed()
    await usingStableAsUsd.transferGovernorship(governor.address)
    await usingStableAsUsd.connect(governor).acceptGovernorship()

    priceProvider = await smock.fake('UniswapV2LikePriceProvider')
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('updateStableCoin', function () {
    it('should revert if not governor', async function () {
      const tx = usingStableAsUsd.updateStableCoins(USDC_ADDRESS, DAI_ADDRESS)
      await expect(tx).revertedWith('not-governor')
    })

    it('should update stable coins token', async function () {
      // given
      expect(await usingStableAsUsd.primaryStableCoin()).eq(DAI_ADDRESS)
      expect(await usingStableAsUsd.secondaryStableCoin()).eq(USDC_ADDRESS)

      // when
      await usingStableAsUsd.connect(governor).updateStableCoins(USDT_ADDRESS, DAI_ADDRESS)

      // then
      expect(await usingStableAsUsd.primaryStableCoin()).eq(USDT_ADDRESS)
      expect(await usingStableAsUsd.secondaryStableCoin()).eq(DAI_ADDRESS)
    })
  })

  describe('getStableCoinIfPegged', function () {
    let lastUpdatedAt: number

    beforeEach(async function () {
      lastUpdatedAt = await timestampFromLatestBlock()
    })

    it('should revert if stables are null', async function () {
      // given
      await usingStableAsUsd
        .connect(governor)
        .updateStableCoins(ethers.constants.AddressZero, ethers.constants.AddressZero)

      // when
      const tx = usingStableAsUsd.getStableCoinIfPegged(priceProvider.address)

      // then
      await expect(tx).revertedWith('stable-coin-not-supported')
    })

    it('should revert if stables price is invalid', async function () {
      // given
      priceProvider['quote(address,address,uint256)'].returns(() => {
        return [0, 0]
      })

      // when
      const tx = usingStableAsUsd.getStableCoinIfPegged(priceProvider.address)

      // then
      await expect(tx).revertedWith('stable-prices-invalid')
    })

    it('should revert if stables price deviation is too high (different decimals)', async function () {
      // given
      await usingStableAsUsd.connect(governor).updateStableCoins(USDC_ADDRESS, DAI_ADDRESS)

      priceProvider['quote(address,address,uint256)'].returns(() => {
        return [parseEther('0.85'), lastUpdatedAt] // 1 USDC = 0.85 DAI
      })

      // when
      const tx = usingStableAsUsd.getStableCoinIfPegged(priceProvider.address)

      // then
      await expect(tx).revertedWith('stable-coins-deviation-too-high')
    })

    it('should revert if stables price deviation is too high (same decimals)', async function () {
      // given
      await usingStableAsUsd.connect(governor).updateStableCoins(USDC_ADDRESS, USDT_ADDRESS)

      priceProvider['quote(address,address,uint256)'].returns(() => {
        return [parseUnits('0.85', 6), lastUpdatedAt] // 1 USDC = 0.85 USDT
      })

      // when
      const tx = usingStableAsUsd.getStableCoinIfPegged(priceProvider.address)

      // then
      await expect(tx).revertedWith('stable-coins-deviation-too-high')
    })

    it('should get primary stable coin if peg is OK (different decimals)', async function () {
      // given
      await usingStableAsUsd.connect(governor).updateStableCoins(DAI_ADDRESS, USDT_ADDRESS)

      priceProvider['quote(address,address,uint256)'].returns(() => {
        return [parseUnits('0.99', 6), lastUpdatedAt] // 1 DAI = 0.99 USDT
      })

      // when
      const stableCoinAddress = await usingStableAsUsd.getStableCoinIfPegged(priceProvider.address)

      // then
      expect(stableCoinAddress).eq(DAI_ADDRESS)
    })

    it('should get primary stable coin if peg is OK (same decimals)', async function () {
      // given
      await usingStableAsUsd.connect(governor).updateStableCoins(USDC_ADDRESS, USDT_ADDRESS)

      priceProvider['quote(address,address,uint256)'].returns(() => {
        return [parseUnits('0.99', 6), lastUpdatedAt] // 1 USDC = 0.99 USDT
      })

      // when
      const stableCoinAddress = await usingStableAsUsd.getStableCoinIfPegged(priceProvider.address)

      // then
      expect(stableCoinAddress).eq(USDC_ADDRESS)
    })
  })

  describe('toUsdRepresentation', function () {
    it('should get correct USD representation (from 6-decimals)', async function () {
      // given
      await usingStableAsUsd.connect(governor).updateStableCoins(USDC_ADDRESS, USDT_ADDRESS)

      // when
      const usdcAmount = parseUnits('1', 6)
      const usdRepresentation = await usingStableAsUsd.toUsdRepresentation(usdcAmount)

      // then
      expect(usdRepresentation).eq(toUSD('1'))
    })

    it('should get correct USD representation (from 18-decimals)', async function () {
      // given
      await usingStableAsUsd.connect(governor).updateStableCoins(DAI_ADDRESS, USDT_ADDRESS)

      // when
      const daiAmount = parseEther('1')
      const usdRepresentation = await usingStableAsUsd.toUsdRepresentation(daiAmount)

      // then
      expect(usdRepresentation).eq(toUSD('1'))
    })
  })
})
