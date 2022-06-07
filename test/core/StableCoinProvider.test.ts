/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {StableCoinProvider, StableCoinProvider__factory} from '../../typechain-types'
import Address from '../../helpers/address'
import {HOUR, parseEther, parseUnits, timestampFromLatestBlock, toUSD} from '../helpers'
import {FakeContract, smock} from '@defi-wonderland/smock'

const {DAI_ADDRESS, USDC_ADDRESS, USDT_ADDRESS} = Address.mainnet
const {AddressZero} = ethers.constants

const STALE_PERIOD = HOUR
const MAX_DEVIATION = parseEther('0.05') // 5%

describe('StableCoinProvider @mainnet', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let governor: SignerWithAddress
  let stableCoinProvider: StableCoinProvider
  let providersAggregator: FakeContract
  let priceProvider: FakeContract

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer, governor] = await ethers.getSigners()

    providersAggregator = await smock.fake('PriceProvidersAggregator')
    priceProvider = await smock.fake('ChainlinkPriceProvider')

    providersAggregator.priceProviders.returns(() => priceProvider.address)

    const stableCoinProviderFactory = new StableCoinProvider__factory(deployer)
    stableCoinProvider = await stableCoinProviderFactory.deploy(
      DAI_ADDRESS,
      USDC_ADDRESS,
      providersAggregator.address,
      STALE_PERIOD,
      MAX_DEVIATION
    )
    await stableCoinProvider.deployed()
    await stableCoinProvider.transferGovernorship(governor.address)
    await stableCoinProvider.connect(governor).acceptGovernorship()
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('updateStableCoin', function () {
    it('should revert if not governor', async function () {
      const tx = stableCoinProvider.updateStableCoins(USDC_ADDRESS, DAI_ADDRESS)
      await expect(tx).revertedWith('not-governor')
    })

    it('should update stable coins token', async function () {
      // given
      expect(await stableCoinProvider.primaryStableCoin()).eq(DAI_ADDRESS)
      expect(await stableCoinProvider.secondaryStableCoin()).eq(USDC_ADDRESS)

      // when
      await stableCoinProvider.connect(governor).updateStableCoins(USDT_ADDRESS, DAI_ADDRESS)

      // then
      expect(await stableCoinProvider.primaryStableCoin()).eq(USDT_ADDRESS)
      expect(await stableCoinProvider.secondaryStableCoin()).eq(DAI_ADDRESS)
    })

    it('should revert if setting stable coins to null', async function () {
      // given
      expect(await stableCoinProvider.primaryStableCoin()).eq(DAI_ADDRESS)
      expect(await stableCoinProvider.secondaryStableCoin()).eq(USDC_ADDRESS)

      // when
      const tx = stableCoinProvider.connect(governor).updateStableCoins(AddressZero, AddressZero)

      // then
      await expect(tx).revertedWith('stable-coins-are-null')
    })
  })

  describe('getStableCoinIfPegged', function () {
    let lastUpdatedAt: number

    beforeEach(async function () {
      lastUpdatedAt = await timestampFromLatestBlock()
    })

    it('should revert if prices are invalid', async function () {
      // given
      priceProvider['getPriceInUsd(address)'].returns((args: [string]) => {
        const [token] = args
        if (token === DAI_ADDRESS) return [0, 0]
        if (token === USDC_ADDRESS) return [0, 0]
        throw Error('not-expected')
      })

      // when
      const tx = stableCoinProvider.getStableCoinIfPegged()

      // then
      await expect(tx).revertedWith('stable-prices-invalid')
    })

    it('should revert if stables prices deviation are too far from $1', async function () {
      // given
      priceProvider['getPriceInUsd(address)'].returns((args: [string]) => {
        const [token] = args
        if (token === DAI_ADDRESS) return [parseEther('0.85'), lastUpdatedAt]
        if (token === USDC_ADDRESS) return [parseEther('0.85'), lastUpdatedAt]
        throw Error('not-expected')
      })

      // when
      const tx = stableCoinProvider.getStableCoinIfPegged()

      // then
      await expect(tx).revertedWith('stable-prices-invalid')
    })

    it('should get primary stable coin if it is OK', async function () {
      // given
      priceProvider['getPriceInUsd(address)'].returns((args: [string]) => {
        const [token] = args
        if (token === DAI_ADDRESS) return [parseEther('0.99'), lastUpdatedAt]
        if (token === USDC_ADDRESS) return [0, 0]
        throw Error('not-expected')
      })

      // when
      const stableCoinAddress = await stableCoinProvider.getStableCoinIfPegged()

      // then
      expect(stableCoinAddress).eq(DAI_ADDRESS)
    })

    it('should get secondary stable coin if the primary is NOT OK', async function () {
      // given
      priceProvider['getPriceInUsd(address)'].returns((args: [string]) => {
        const [token] = args
        if (token === DAI_ADDRESS) return [parseEther('0.55'), lastUpdatedAt]
        if (token === USDC_ADDRESS) return [parseEther('0.99'), lastUpdatedAt]
        throw Error('not-expected')
      })

      // when
      const stableCoinAddress = await stableCoinProvider.getStableCoinIfPegged()

      // then
      expect(stableCoinAddress).eq(USDC_ADDRESS)
    })
  })

  describe('toUsdRepresentation', function () {
    it('should get correct USD representation (from 6-decimals)', async function () {
      // given
      await stableCoinProvider.connect(governor).updateStableCoins(USDC_ADDRESS, USDT_ADDRESS)

      // when
      const usdcAmount = parseUnits('1', 6)
      const usdRepresentation = await stableCoinProvider.toUsdRepresentation(usdcAmount)

      // then
      expect(usdRepresentation).eq(toUSD('1'))
    })

    it('should get correct USD representation (from 18-decimals)', async function () {
      // given
      await stableCoinProvider.connect(governor).updateStableCoins(DAI_ADDRESS, USDT_ADDRESS)

      // when
      const daiAmount = parseEther('1')
      const usdRepresentation = await stableCoinProvider.toUsdRepresentation(daiAmount)

      // then
      expect(usdRepresentation).eq(toUSD('1'))
    })
  })
})
