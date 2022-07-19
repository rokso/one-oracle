/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {VspMainnetOracle, VspMainnetOracle__factory} from '../../typechain-types'
import {Address, Provider} from '../../helpers'
import {FakeContract, smock} from '@defi-wonderland/smock'
import {parseEther, timestampFromLatestBlock, HOUR, parseUnits} from '../helpers'
import {BigNumber} from 'ethers'

const STALE_PERIOD = HOUR
const MAX_DEVIATION = parseEther('0.1') // 10%

const {DAI_ADDRESS, VSP_ADDRESS} = Address.mainnet

describe('VspMainnetOracle @mainnet', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let governor: SignerWithAddress
  let aggregator: FakeContract
  let uniswapV2PriceProvider: FakeContract
  let vspOracle: VspMainnetOracle
  let lastUpdatedAt: number
  let stableCoinProvider: FakeContract

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer, governor] = await ethers.getSigners()
    lastUpdatedAt = await timestampFromLatestBlock()

    aggregator = await smock.fake('PriceProvidersAggregator')
    uniswapV2PriceProvider = await smock.fake('UniswapV2LikePriceProvider')

    uniswapV2PriceProvider['quote(address,address,uint256)'].returns(() => {
      // 1 DAI = 1 USDC
      return [parseUnits('1', 6), lastUpdatedAt]
    })
    aggregator['priceProviders(uint8)'].returns(() => uniswapV2PriceProvider.address)

    stableCoinProvider = await smock.fake('StableCoinProvider')
    stableCoinProvider.getStableCoinIfPegged.returns(DAI_ADDRESS)

    const vspMainnetOracleFactory = new VspMainnetOracle__factory(deployer)
    vspOracle = await vspMainnetOracleFactory.deploy(
      aggregator.address,
      stableCoinProvider.address,
      MAX_DEVIATION,
      STALE_PERIOD
    )
    await vspOracle.deployed()
    await vspOracle.transferGovernorship(governor.address)
    await vspOracle.connect(governor).acceptGovernorship()
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('getPriceInUsd', function () {
    it('should return UniV2 price when both DEXes prices are OK', async function () {
      // given
      const uniswapV2AmountOut = parseEther('0.83')
      const sushiAmountOut = parseEther('0.84')
      aggregator['quoteTokenToUsd(uint8,address,uint256)'].returns((args: [number, string, BigNumber]) => {
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
      aggregator['quoteTokenToUsd(uint8,address,uint256)'].returns((args: [number, string, BigNumber]) => {
        const [provider] = args
        if (provider === Provider.UNISWAP_V2) return [uniswapV2AmountOut, lastUpdatedAt]
        if (provider === Provider.SUSHISWAP) return [sushiAmountOut, lastUpdatedAt]
      })

      // when
      const tx = vspOracle.getPriceInUsd(VSP_ADDRESS)

      // then
      await expect(tx).revertedWith('one-or-both-prices-invalid')
    })

    it('should revert if one of the prices is stale', async function () {
      // given
      const uniswapV2AmountOut = parseEther('0.83')
      const sushiAmountOut = parseEther('0.84')
      aggregator['quoteTokenToUsd(uint8,address,uint256)'].returns((args: [number, string, BigNumber]) => {
        const [provider] = args
        if (provider === Provider.UNISWAP_V2) return [uniswapV2AmountOut, 0]
        if (provider === Provider.SUSHISWAP) return [sushiAmountOut, lastUpdatedAt]
      })

      // when
      const tx = vspOracle.getPriceInUsd(VSP_ADDRESS)

      // then
      await expect(tx).revertedWith('one-or-both-prices-invalid')
    })

    it('should revert if deviation is too much', async function () {
      // given
      const uniswapV2AmountOut = parseEther('0.83')
      const sushiAmountOut = parseEther('0.50')
      aggregator['quoteTokenToUsd(uint8,address,uint256)'].returns((args: [number, string, BigNumber]) => {
        const [provider] = args
        if (provider === Provider.UNISWAP_V2) return [uniswapV2AmountOut, lastUpdatedAt]
        if (provider === Provider.SUSHISWAP) return [sushiAmountOut, lastUpdatedAt]
      })

      // when
      const tx = vspOracle.getPriceInUsd(VSP_ADDRESS)

      // then
      await expect(tx).revertedWith('prices-deviation-too-high')
    })
  })
})
