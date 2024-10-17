/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {MainAndFallbackOracle} from '../../typechain-types'
import {Addresses} from '../../helpers'
import {FakeContract, smock} from '@defi-wonderland/smock'
import {parseEther, timestampFromLatestBlock} from '../helpers'

const STALE_PERIOD = ethers.constants.MaxUint256

const {WETH, DAI} = Addresses.mainnet

describe('MainAndFallbacksOracle @mainnet', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let alice: SignerWithAddress
  let mainProvider: FakeContract
  let fallbackProvider: FakeContract
  let oracle: MainAndFallbackOracle

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer, alice] = await ethers.getSigners()

    mainProvider = await smock.fake('PriceProviderMock')
    fallbackProvider = await smock.fake('PriceProviderMock')

    const factory = await ethers.getContractFactory('MainAndFallbackOracle', deployer)
    oracle = await factory.deploy(mainProvider.address, fallbackProvider.address, STALE_PERIOD)
    await oracle.deployed()
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('getPriceInUsd', function () {
    let lastUpdatedAt: number

    beforeEach(async function () {
      lastUpdatedAt = await timestampFromLatestBlock()
    })

    describe('when price from main is OK', function () {
      it('should get price from main', async function () {
        // given
        const mainPrice = parseEther('3,000')
        mainProvider.getPriceInUsd.returns(() => [mainPrice, lastUpdatedAt])

        // when-then
        expect(await oracle.getPriceInUsd(WETH)).eq(mainPrice)
      })
    })

    describe('when price from main is NOT OK', function () {
      it('should get price from fallback', async function () {
        // given
        const price = parseEther('3,000')
        mainProvider.getPriceInUsd.returns(() => [0, 0])
        fallbackProvider.getPriceInUsd.returns(() => [price, lastUpdatedAt])

        // when-then
        expect(await oracle.getPriceInUsd(WETH)).eq(price)
      })

      describe('when price from fallback is NOT OK', function () {
        it('should revert', async function () {
          // given
          mainProvider.getPriceInUsd.returns(() => [0, 0])
          fallbackProvider.getPriceInUsd.returns(() => [0, 0])

          // when
          const call = oracle.getPriceInUsd(WETH)

          // then
          await expect(call).revertedWith('both-providers-failed')
        })
      })
    })
  })

  describe('quote', function () {
    let lastUpdatedAt: number

    beforeEach(async function () {
      lastUpdatedAt = await timestampFromLatestBlock()
    })

    describe('when price from main is OK', function () {
      it('should get price from main', async function () {
        // given
        const amountOut = parseEther('3,000')
        mainProvider.quote.returns(() => [amountOut, lastUpdatedAt, lastUpdatedAt])

        // when-then
        expect(await oracle.quote(WETH, DAI, parseEther('1'))).eq(amountOut)
      })
    })

    describe('when price from main is NOT OK', function () {
      it('should get price from fallback ', async function () {
        // given
        const amountOut = parseEther('3,000')
        mainProvider.quote.returns(() => [0, 0, 0])
        fallbackProvider.quote.returns(() => [amountOut, lastUpdatedAt, lastUpdatedAt])

        // when-then
        expect(await oracle.quote(WETH, DAI, parseEther('1'))).eq(amountOut)
      })

      describe('when price from fallback is NOT OK', function () {
        it('should revert', async function () {
          // given
          mainProvider.quote.returns(() => [0, 0, 0])
          fallbackProvider.quote.returns(() => [0, 0, 0])

          // when
          const call = oracle.quote(WETH, DAI, parseEther('1'))

          // then
          await expect(call).revertedWith('both-providers-failed')
        })
      })
    })
  })

  describe('quoteTokenToUsd', function () {
    let lastUpdatedAt: number

    beforeEach(async function () {
      lastUpdatedAt = await timestampFromLatestBlock()
    })

    describe('when price from main is OK', function () {
      it('should get price from main', async function () {
        // given
        const amountOut = parseEther('3,000')
        mainProvider.quoteTokenToUsd.returns(() => [amountOut, lastUpdatedAt])

        // when-then
        expect(await oracle.quoteTokenToUsd(WETH, parseEther('1'))).eq(amountOut)
      })
    })

    describe('when price from main is NOT OK', function () {
      it('should get price from fallback', async function () {
        // given
        const amountOut = parseEther('3,000')
        mainProvider.quoteTokenToUsd.returns(() => [0, 0])
        fallbackProvider.quoteTokenToUsd.returns(() => [amountOut, lastUpdatedAt])

        // when-then
        expect(await oracle.quoteTokenToUsd(WETH, parseEther('1'))).eq(amountOut)
      })

      describe('when price from fallback is NOT OK', function () {
        it('should revert', async function () {
          // given
          mainProvider.quoteTokenToUsd.returns(() => [0, 0])
          fallbackProvider.quoteTokenToUsd.returns(() => [0, 0])

          // when
          const call = oracle.quoteTokenToUsd(WETH, parseEther('1'))

          // then
          await expect(call).revertedWith('both-providers-failed')
        })
      })
    })
  })

  describe('quoteUsdToToken', function () {
    let lastUpdatedAt: number

    beforeEach(async function () {
      lastUpdatedAt = await timestampFromLatestBlock()
    })

    describe('when price from main is OK', function () {
      it('should get price from main', async function () {
        // given
        const amountOut = parseEther('3,000')
        mainProvider.quoteUsdToToken.returns(() => [amountOut, lastUpdatedAt])

        // when-then
        expect(await oracle.quoteUsdToToken(WETH, parseEther('1'))).eq(amountOut)
      })
    })

    describe('when price from main is NOT OK', function () {
      it('should get price from fallback', async function () {
        // given
        const amountOut = parseEther('3,000')
        mainProvider.quoteUsdToToken.returns(() => [0, 0])
        fallbackProvider.quoteUsdToToken.returns(() => [amountOut, lastUpdatedAt])

        // when-then
        expect(await oracle.quoteUsdToToken(WETH, parseEther('1'))).eq(amountOut)
      })

      describe('when price from fallback is NOT OK', function () {
        it('should revert', async function () {
          // given
          mainProvider.quoteUsdToToken.returns(() => [0, 0])
          fallbackProvider.quoteUsdToToken.returns(() => [0, 0])

          // when
          const call = oracle.quoteUsdToToken(WETH, parseEther('1'))

          // then
          await expect(call).revertedWith('both-providers-failed')
        })
      })
    })
  })
})
