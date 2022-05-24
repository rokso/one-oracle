/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {
  AggregatorV3Interface,
  AggregatorV3Interface__factory,
  FluxPriceProvider,
  FluxPriceProvider__factory,
  IERC20,
  IERC20__factory,
} from '../../typechain-types'
import Address from '../../helpers/address'
import {parseEther, parseUnits} from '../helpers'
import {FakeContract, smock} from '@defi-wonderland/smock'

const {
  USDC_ADDRESS,
  WETH_ADDRESS,
  WMATIC_ADDRESS,
  FLUX_USDC_USD_AGGREGATOR,
  FLUX_ETH_USD_AGGREGATOR,
  FLUX_MATIC_USD_AGGREGATOR,
} = Address.mumbai

const MAX_DEVIATION = parseEther('0.01') // 1%

describe('FluxPriceProvider @mumbai', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let governor: SignerWithAddress
  let priceProvider: FluxPriceProvider
  let usdc: IERC20
  let weth: IERC20
  let wmatic: IERC20

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer, governor] = await ethers.getSigners()

    usdc = IERC20__factory.connect(USDC_ADDRESS, deployer)
    weth = IERC20__factory.connect(WETH_ADDRESS, deployer)
    wmatic = IERC20__factory.connect(WMATIC_ADDRESS, deployer)

    const priceProviderFactory = new FluxPriceProvider__factory(deployer)
    priceProvider = await priceProviderFactory.deploy(MAX_DEVIATION)
    await priceProvider.deployed()
    await priceProvider.transferGovernorship(governor.address)
    await priceProvider.connect(governor).acceptGovernorship()

    await priceProvider.connect(governor).addAggregator(usdc.address, FLUX_USDC_USD_AGGREGATOR)
    await priceProvider.connect(governor).addAggregator(weth.address, FLUX_ETH_USD_AGGREGATOR)
    await priceProvider.connect(governor).addAggregator(wmatic.address, FLUX_MATIC_USD_AGGREGATOR)
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('getPriceInUsd', function () {
    it('should WETH price', async function () {
      const {_priceInUsd} = await priceProvider.getPriceInUsd(weth.address)
      expect(_priceInUsd).closeTo(parseEther('2,340'), parseEther('1'))
    })

    it('should WMATIC price', async function () {
      const {_priceInUsd} = await priceProvider.getPriceInUsd(wmatic.address)
      expect(_priceInUsd).closeTo(parseEther('0.9357'), parseEther('0.1'))
    })

    it('should USDC price', async function () {
      const {_priceInUsd} = await priceProvider.getPriceInUsd(usdc.address)
      expect(_priceInUsd).closeTo(parseEther('1'), parseEther('0.1'))
    })

    describe('when having more than one aggregator for the same token', function () {
      let firstAggregator: AggregatorV3Interface
      let secondAggregator: FakeContract

      beforeEach(async function () {
        firstAggregator = AggregatorV3Interface__factory.connect(FLUX_ETH_USD_AGGREGATOR, deployer)
        secondAggregator = await smock.fake('AggregatorV3Interface')
        secondAggregator.decimals.returns(() => 8)
        await priceProvider.connect(governor).addAggregator(weth.address, secondAggregator.address)
      })

      it('should get the most recent price when deviation is low', async function () {
        // given
        const {answer: price0, updatedAt: updatedAt0} = await firstAggregator.latestRoundData()

        // when
        const price1 = price0.add(parseUnits('1', 8))
        const updatedAt1 = updatedAt0.add('1')
        secondAggregator.latestRoundData.returns(() => [0, price1, 0, updatedAt1, 0])
        const {_priceInUsd} = await priceProvider.getPriceInUsd(weth.address)

        // then
        const expectedPrice = price1.mul(parseUnits('1', 10)) // From 8 to 18 decimals
        expect(_priceInUsd).eq(expectedPrice)
      })

      it('should revert if deviation is high', async function () {
        // given
        const {answer: price0, updatedAt: updatedAt0} = await firstAggregator.latestRoundData()

        // when
        const price1 = price0.div('2')
        const updatedAt1 = updatedAt0
        secondAggregator.latestRoundData.returns(() => [0, price1, 0, updatedAt1, 0])
        const tx = priceProvider.getPriceInUsd(weth.address)

        // then
        await expect(tx).reverted
      })
    })
  })

  describe('quote', function () {
    it('should revert if aggregator does not exist', async function () {
      const tx = priceProvider.quote(weth.address, ethers.constants.AddressZero, parseEther('1'))
      await expect(tx).revertedWith('aggregator-not-found')
    })

    it('should quote same token to same token', async function () {
      const amountIn = parseEther('100')
      const {_amountOut} = await priceProvider.quote(weth.address, weth.address, amountIn)
      expect(_amountOut).eq(amountIn)
    })

    it('should quote 1 WETH to USDC', async function () {
      const {_amountOut} = await priceProvider.quote(weth.address, usdc.address, parseEther('1'))
      expect(_amountOut).closeTo(parseUnits('2,341', 6), parseUnits('1', 6))
    })

    it('should quote 1 WMATIC to USDC', async function () {
      const {_amountOut} = await priceProvider.quote(wmatic.address, usdc.address, parseEther('1'))
      expect(_amountOut).closeTo(parseUnits('0.9191', 6), parseUnits('0.01', 6))
    })

    it('should quote 1 WMATIC to WETH', async function () {
      const {_amountOut} = await priceProvider.quote(wmatic.address, weth.address, parseEther('1'))
      expect(_amountOut).closeTo(parseEther('0.0003926'), parseEther('0.0001'))
    })

    it('should quote 1 USDC to WETH', async function () {
      const {_amountOut} = await priceProvider.quote(usdc.address, weth.address, parseUnits('1', 6))
      expect(_amountOut).closeTo(parseEther('0.000427'), parseEther('0.0001'))
    })

    it('should quote 1 USDC to WMATIC', async function () {
      const {_amountOut} = await priceProvider.quote(usdc.address, wmatic.address, parseUnits('1', 6))
      expect(_amountOut).closeTo(parseEther('1.0879'), parseEther('0.001'))
    })
  })

  describe('quoteTokenToUsd', function () {
    it('should revert if aggregator does not exist', async function () {
      const tx = priceProvider.quoteTokenToUsd(ethers.constants.AddressZero, parseEther('1'))
      await expect(tx).revertedWith('aggregator-not-found')
    })

    it('should quote WETH to USD', async function () {
      const {_amountOut} = await priceProvider.quoteTokenToUsd(weth.address, parseEther('1'))
      expect(_amountOut).closeTo(parseEther('2,340.77'), parseEther('1'))
    })

    it('should quote WMATIC to USD', async function () {
      const {_amountOut} = await priceProvider.quoteTokenToUsd(wmatic.address, parseEther('10'))
      expect(_amountOut).closeTo(parseEther('9.189'), parseEther('1'))
    })

    it('should quote USDC to USD', async function () {
      const {_amountOut} = await priceProvider.quoteTokenToUsd(usdc.address, parseUnits('100', 6))
      expect(_amountOut).closeTo(parseEther('100'), parseEther('1'))
    })
  })

  describe('quoteUsdToToken', function () {
    it('should revert if aggregator does not exist', async function () {
      const tx = priceProvider.quoteUsdToToken(ethers.constants.AddressZero, parseEther('1'))
      await expect(tx).revertedWith('aggregator-not-found')
    })

    it('should quote USD to WETH', async function () {
      const {_amountOut} = await priceProvider.quoteUsdToToken(weth.address, parseEther('3,236'))
      expect(_amountOut).closeTo(parseEther('1'), parseEther('1'))
    })

    it('should quote USD to WMATIC', async function () {
      const {_amountOut} = await priceProvider.quoteUsdToToken(wmatic.address, parseEther('9.189'))
      expect(_amountOut).closeTo(parseEther('10'), parseEther('1'))
    })

    it('should quote USD to USDC', async function () {
      const {_amountOut} = await priceProvider.quoteUsdToToken(usdc.address, parseEther('100'))
      expect(_amountOut).closeTo(parseUnits('100', 6), parseUnits('1', 6))
    })
  })

  describe('addAggregator', function () {
    let someAggregator: FakeContract

    beforeEach(async function () {
      someAggregator = await smock.fake('AggregatorV3Interface')
      someAggregator.decimals.returns(() => 8)
    })

    it('should revert if not governor', async function () {
      const tx = priceProvider.addAggregator(weth.address, someAggregator.address)
      await expect(tx).revertedWith('not-governor')
    })

    it('should revert if token is null', async function () {
      const tx = priceProvider.connect(governor).addAggregator(ethers.constants.AddressZero, someAggregator.address)
      await expect(tx).revertedWith('token-is-null')
    })

    it('should revert if aggregator is null', async function () {
      const tx = priceProvider.connect(governor).addAggregator(weth.address, ethers.constants.AddressZero)
      await expect(tx).revertedWith('aggregator-is-null')
    })

    it('should revert if aggregator already added', async function () {
      const tx = priceProvider.connect(governor).addAggregator(weth.address, FLUX_ETH_USD_AGGREGATOR)
      await expect(tx).revertedWith('aggregator-exists')
    })

    it('should add an aggregator', async function () {
      // given
      const before = await priceProvider.getAggregatorsOf(weth.address)
      expect(before.length).eq(1)

      // when
      await priceProvider.connect(governor).addAggregator(weth.address, someAggregator.address)

      // then
      const after = await priceProvider.getAggregatorsOf(weth.address)
      expect(after.length).eq(2)
    })
  })

  describe('removeAggregator', function () {
    it('should revert if not governor', async function () {
      const tx = priceProvider.removeAggregator(weth.address, FLUX_ETH_USD_AGGREGATOR)
      await expect(tx).revertedWith('not-governor')
    })

    it('should revert if token is null', async function () {
      const tx = priceProvider.connect(governor).removeAggregator(ethers.constants.AddressZero, FLUX_ETH_USD_AGGREGATOR)
      await expect(tx).revertedWith('token-is-null')
    })

    it('should revert if aggregator is null', async function () {
      const tx = priceProvider.connect(governor).removeAggregator(weth.address, ethers.constants.AddressZero)
      await expect(tx).revertedWith('aggregator-is-null')
    })

    it('should revert if aggregator does not exist', async function () {
      const tx = priceProvider.connect(governor).removeAggregator(weth.address, FLUX_USDC_USD_AGGREGATOR)
      await expect(tx).revertedWith('aggregator-doesnt-exist')
    })

    it('should remove aggregator', async function () {
      // given
      const before = await priceProvider.getAggregatorsOf(weth.address)
      expect(before.length).eq(1)

      // when
      await priceProvider.connect(governor).removeAggregator(weth.address, FLUX_ETH_USD_AGGREGATOR)

      // then
      const after = await priceProvider.getAggregatorsOf(weth.address)
      expect(after.length).eq(0)
    })
  })
})
