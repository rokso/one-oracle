/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {
  AggregatorV3Interface,
  AggregatorV3Interface__factory,
  FluxPriceProvider,
  FluxPriceProvider__factory,
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

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer, governor] = await ethers.getSigners()

    const priceProviderFactory = new FluxPriceProvider__factory(deployer)
    priceProvider = await priceProviderFactory.deploy(MAX_DEVIATION)
    await priceProvider.deployed()
    await priceProvider.transferGovernorship(governor.address)
    await priceProvider.connect(governor).acceptGovernorship()

    await priceProvider.connect(governor).addAggregator(USDC_ADDRESS, FLUX_USDC_USD_AGGREGATOR)
    await priceProvider.connect(governor).addAggregator(WETH_ADDRESS, FLUX_ETH_USD_AGGREGATOR)
    await priceProvider.connect(governor).addAggregator(WMATIC_ADDRESS, FLUX_MATIC_USD_AGGREGATOR)
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('getPriceInUsd', function () {
    it('should WETH price', async function () {
      const {_priceInUsd} = await priceProvider.getPriceInUsd(WETH_ADDRESS)
      expect(_priceInUsd).closeTo(parseEther('2,340'), parseEther('1'))
    })

    it('should WMATIC price', async function () {
      const {_priceInUsd} = await priceProvider.getPriceInUsd(WMATIC_ADDRESS)
      expect(_priceInUsd).closeTo(parseEther('0.9357'), parseEther('0.1'))
    })

    it('should USDC price', async function () {
      const {_priceInUsd} = await priceProvider.getPriceInUsd(USDC_ADDRESS)
      expect(_priceInUsd).closeTo(parseEther('1'), parseEther('0.1'))
    })

    describe('when having more than one aggregator for the same token', function () {
      let firstAggregator: AggregatorV3Interface
      let secondAggregator: FakeContract

      beforeEach(async function () {
        firstAggregator = AggregatorV3Interface__factory.connect(FLUX_ETH_USD_AGGREGATOR, deployer)
        secondAggregator = await smock.fake('AggregatorV3Interface')
        secondAggregator.decimals.returns(() => 8)
        await priceProvider.connect(governor).addAggregator(WETH_ADDRESS, secondAggregator.address)
      })

      it('should get the most recent price when deviation is low', async function () {
        // given
        const {answer: price0, updatedAt: updatedAt0} = await firstAggregator.latestRoundData()

        // when
        const price1 = price0.add(parseUnits('1', 8))
        const updatedAt1 = updatedAt0.add('1')
        secondAggregator.latestRoundData.returns(() => [0, price1, 0, updatedAt1, 0])
        const {_priceInUsd} = await priceProvider.getPriceInUsd(WETH_ADDRESS)

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
        const tx = priceProvider.getPriceInUsd(WETH_ADDRESS)

        // then
        await expect(tx).reverted
      })
    })
  })

  describe('addAggregator', function () {
    let someAggregator: FakeContract

    beforeEach(async function () {
      someAggregator = await smock.fake('AggregatorV3Interface')
      someAggregator.decimals.returns(() => 8)
    })

    it('should revert if not governor', async function () {
      const tx = priceProvider.addAggregator(WETH_ADDRESS, someAggregator.address)
      await expect(tx).revertedWith('not-governor')
    })

    it('should revert if token is null', async function () {
      const tx = priceProvider.connect(governor).addAggregator(ethers.constants.AddressZero, someAggregator.address)
      await expect(tx).revertedWith('token-is-null')
    })

    it('should revert if aggregator is null', async function () {
      const tx = priceProvider.connect(governor).addAggregator(WETH_ADDRESS, ethers.constants.AddressZero)
      await expect(tx).revertedWith('aggregator-is-null')
    })

    it('should revert if aggregator already added', async function () {
      const tx = priceProvider.connect(governor).addAggregator(WETH_ADDRESS, FLUX_ETH_USD_AGGREGATOR)
      await expect(tx).revertedWith('aggregator-exists')
    })

    it('should add an aggregator', async function () {
      // given
      const before = await priceProvider.getAggregatorsOf(WETH_ADDRESS)
      expect(before.length).eq(1)

      // when
      await priceProvider.connect(governor).addAggregator(WETH_ADDRESS, someAggregator.address)

      // then
      const after = await priceProvider.getAggregatorsOf(WETH_ADDRESS)
      expect(after.length).eq(2)
    })
  })

  describe('removeAggregator', function () {
    it('should revert if not governor', async function () {
      const tx = priceProvider.removeAggregator(WETH_ADDRESS, FLUX_ETH_USD_AGGREGATOR)
      await expect(tx).revertedWith('not-governor')
    })

    it('should revert if token is null', async function () {
      const tx = priceProvider.connect(governor).removeAggregator(ethers.constants.AddressZero, FLUX_ETH_USD_AGGREGATOR)
      await expect(tx).revertedWith('token-is-null')
    })

    it('should revert if aggregator is null', async function () {
      const tx = priceProvider.connect(governor).removeAggregator(WETH_ADDRESS, ethers.constants.AddressZero)
      await expect(tx).revertedWith('aggregator-is-null')
    })

    it('should revert if aggregator does not exist', async function () {
      const tx = priceProvider.connect(governor).removeAggregator(WETH_ADDRESS, FLUX_USDC_USD_AGGREGATOR)
      await expect(tx).revertedWith('aggregator-doesnt-exist')
    })

    it('should remove aggregator', async function () {
      // given
      const before = await priceProvider.getAggregatorsOf(WETH_ADDRESS)
      expect(before.length).eq(1)

      // when
      await priceProvider.connect(governor).removeAggregator(WETH_ADDRESS, FLUX_ETH_USD_AGGREGATOR)

      // then
      const after = await priceProvider.getAggregatorsOf(WETH_ADDRESS)
      expect(after.length).eq(0)
    })
  })
})
