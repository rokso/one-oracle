/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {VspMainnetOracle, VspMainnetOracle__factory} from '../../typechain-types'
import Address from '../../helpers/address'
import {FakeContract, smock} from '@defi-wonderland/smock'
import {parseEther, timestampFromLatestBlock, Provider} from '../helpers'
import {BigNumber} from 'ethers'

const STALE_PERIOD = ethers.constants.MaxUint256
const MAX_DEVIATION = parseEther('0.1') // 10%

const VSP_ADDRESS = '0x1b40183EFB4Dd766f11bDa7A7c3AD8982e998421'

const {DAI_ADDRESS} = Address.mainnet

describe('VspMainnetOracle @mainnet', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let governor: SignerWithAddress
  let aggregator: FakeContract
  let vspOracle: VspMainnetOracle

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer, governor] = await ethers.getSigners()

    aggregator = await smock.fake('PriceProvidersAggregator')

    const vspMainnetOracleFactory = new VspMainnetOracle__factory(deployer)
    vspOracle = await vspMainnetOracleFactory.deploy(aggregator.address, DAI_ADDRESS, MAX_DEVIATION, STALE_PERIOD)
    await vspOracle.deployed()
    await vspOracle.transferGovernorship(governor.address)
    await vspOracle.connect(governor).acceptGovernorship()
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('updateProvidersAggregator', function () {
    it('should revert if not governor', async function () {
      const tx = vspOracle.updateProvidersAggregator(aggregator.address)
      await expect(tx).revertedWith('not-governor')
    })

    it('should revert if setting null', async function () {
      const tx = vspOracle.connect(governor).updateProvidersAggregator(ethers.constants.AddressZero)
      await expect(tx).revertedWith('address-is-null')
    })

    it('should update providers aggregator', async function () {
      // given
      const before = await vspOracle.providersAggregator()
      expect(before).eq(aggregator.address)

      // when
      await vspOracle.connect(governor).updateProvidersAggregator(deployer.address)

      // then
      const after = await vspOracle.providersAggregator()
      expect(after).eq(deployer.address)
    })
  })

  describe('updateMaxDeviation', function () {
    it('should revert if not governor', async function () {
      const tx = vspOracle.updateMaxDeviation(MAX_DEVIATION)
      await expect(tx).revertedWith('not-governor')
    })

    it('should update max deviation', async function () {
      // given
      const before = await vspOracle.maxDeviation()
      expect(before).eq(MAX_DEVIATION)

      // when
      await vspOracle.connect(governor).updateMaxDeviation(1)

      // then
      const after = await vspOracle.maxDeviation()
      expect(after).eq(1)
    })
  })

  describe('updateStalePeriod', function () {
    it('should revert if not governor', async function () {
      const tx = vspOracle.updateStalePeriod(Provider.UNISWAP_V3)
      await expect(tx).revertedWith('not-governor')
    })

    it('should update default provider (allows none)', async function () {
      // given
      const before = await vspOracle.stalePeriod()
      expect(before).eq(STALE_PERIOD)

      // when
      await vspOracle.connect(governor).updateStalePeriod(1)

      // then
      const after = await vspOracle.stalePeriod()
      expect(after).eq(1)
    })
  })

  describe('getPriceInUsd', function () {
    let lastUpdatedAt: number

    beforeEach(async function () {
      lastUpdatedAt = await timestampFromLatestBlock()
    })

    it('should return UniV2 price when both DEXes prices are OK', async function () {
      // given
      const uniswapV2AmountOut = parseEther('0.83')
      const sushiAmountOut = parseEther('0.84')
      aggregator['quote(uint8,address,address,uint256)'].returns((args: [number, string, string, BigNumber]) => {
        const [provider] = args
        if (provider === Provider.UNISWAP_V2) return [uniswapV2AmountOut, lastUpdatedAt]
        if (provider === Provider.SUSHISWAP) return [sushiAmountOut, lastUpdatedAt]
      })

      // when
      const amountOut = await vspOracle.getPriceInUsd(VSP_ADDRESS)

      // then
      expect(amountOut).eq(uniswapV2AmountOut)
    })

    it('should revert if not quoting VSP', async function () {
      // when
      const tx = vspOracle.getPriceInUsd(DAI_ADDRESS)

      // then
      await expect(tx).revertedWith('invalid-token')
    })

    it('should revert if one of the prices is 0', async function () {
      // given
      const uniswapV2AmountOut = parseEther('0.83')
      const sushiAmountOut = parseEther('0')
      aggregator['quote(uint8,address,address,uint256)'].returns((args: [number, string, string, BigNumber]) => {
        const [provider] = args
        if (provider === Provider.UNISWAP_V2) return [uniswapV2AmountOut, lastUpdatedAt]
        if (provider === Provider.SUSHISWAP) return [sushiAmountOut, lastUpdatedAt]
      })

      // when
      const tx = vspOracle.getPriceInUsd(DAI_ADDRESS)

      // then
      await expect(tx).revertedWith('one-or-both-prices-invalid')
    })

    it('should revert if one of the prices is stale', async function () {
      // given
      const uniswapV2AmountOut = parseEther('0.83')
      const sushiAmountOut = parseEther('0.84')
      aggregator['quote(uint8,address,address,uint256)'].returns((args: [number, string, string, BigNumber]) => {
        const [provider] = args
        if (provider === Provider.UNISWAP_V2) return [uniswapV2AmountOut, 0]
        if (provider === Provider.SUSHISWAP) return [sushiAmountOut, lastUpdatedAt]
      })

      // when
      const tx = vspOracle.getPriceInUsd(DAI_ADDRESS)

      // then
      await expect(tx).revertedWith('one-or-both-prices-invalid')
    })

    it('should revert if deviation is too much', async function () {
      // given
      const uniswapV2AmountOut = parseEther('0.83')
      const sushiAmountOut = parseEther('0.50')
      aggregator['quote(uint8,address,address,uint256)'].returns((args: [number, string, string, BigNumber]) => {
        const [provider] = args
        if (provider === Provider.UNISWAP_V2) return [uniswapV2AmountOut, 0]
        if (provider === Provider.SUSHISWAP) return [sushiAmountOut, lastUpdatedAt]
      })

      // when
      const tx = vspOracle.getPriceInUsd(DAI_ADDRESS)

      // then
      await expect(tx).revertedWith('prices-deviation-too-high')
    })
  })
})
