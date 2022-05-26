/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {
  UniswapV3PriceProvider,
  UniswapV3PriceProvider__factory,
  IERC20,
  IERC20__factory,
  PriceProvidersAggregator,
  PriceProvidersAggregator__factory,
  UniswapV3CrossPoolOracle__factory,
  ChainlinkMainnetPriceProvider__factory,
  ChainlinkMainnetPriceProvider,
} from '../../typechain-types'
import {Address, Provider} from '../../helpers'
import {parseEther, parseUnits, HOUR} from '../helpers'

const DEFAULT_TWAP_PERIOD = HOUR
const DEFAULT_POOLS_FEE = 3000 // 0.3%

const {WETH_ADDRESS, WBTC_ADDRESS, USDC_ADDRESS} = Address.mainnet

// Note: No need to cover all chains on this test
describe('PriceProvidersAggregator @mainnet', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let governor: SignerWithAddress
  let usdc: IERC20
  let weth: IERC20
  let wbtc: IERC20
  let uniswapV3Provider: UniswapV3PriceProvider
  let chainlinkProvider: ChainlinkMainnetPriceProvider
  let aggregator: PriceProvidersAggregator

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer, governor] = await ethers.getSigners()
    weth = IERC20__factory.connect(WETH_ADDRESS, deployer)
    wbtc = IERC20__factory.connect(WBTC_ADDRESS, deployer)
    usdc = IERC20__factory.connect(USDC_ADDRESS, deployer)

    const crossPoolOracleFactory = new UniswapV3CrossPoolOracle__factory(deployer)
    const crossPoolOracle = await crossPoolOracleFactory.deploy(weth.address)
    await crossPoolOracle.deployed()

    const uniswapV3ProviderFactory = new UniswapV3PriceProvider__factory(deployer)
    uniswapV3Provider = await uniswapV3ProviderFactory.deploy(
      crossPoolOracle.address,
      DEFAULT_TWAP_PERIOD,
      DEFAULT_POOLS_FEE,
      ethers.constants.AddressZero // stableCoinProvider
    )
    await uniswapV3Provider.deployed()
    await uniswapV3Provider.transferGovernorship(governor.address)
    await uniswapV3Provider.connect(governor).acceptGovernorship()

    const chainlinkProviderFactory = new ChainlinkMainnetPriceProvider__factory(deployer)
    chainlinkProvider = await chainlinkProviderFactory.deploy()
    await chainlinkProvider.deployed()

    const aggregatorProviderFactory = new PriceProvidersAggregator__factory(deployer)
    aggregator = await aggregatorProviderFactory.deploy(WETH_ADDRESS)
    await aggregator.deployed()

    await aggregator.setPriceProvider(Provider.UNISWAP_V3, uniswapV3Provider.address)
    await aggregator.setPriceProvider(Provider.CHAINLINK, chainlinkProvider.address)

    await aggregator.transferGovernorship(governor.address)
    await aggregator.connect(governor).acceptGovernorship()
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('setPriceProvider', function () {
    it('should revert if not governor', async function () {
      const tx = aggregator.setPriceProvider(Provider.UNISWAP_V3, uniswapV3Provider.address)
      await expect(tx).revertedWith('not-governor')
    })

    it('should update price provider', async function () {
      // given
      const before = await aggregator.priceProviders(Provider.UNISWAP_V3)
      expect(before).eq(uniswapV3Provider.address)

      // when
      await aggregator.connect(governor).setPriceProvider(Provider.UNISWAP_V3, governor.address)

      // then
      const after = await aggregator.priceProviders(Provider.UNISWAP_V3)
      expect(after).eq(governor.address)
    })
  })

  describe('quote using different providers', function () {
    it('should revert when a provider is not set', async function () {
      const amountIn = parseEther('100')
      const call = aggregator['quote(uint8,address,uint8,address,uint256)'](
        Provider.PANGOLIN,
        weth.address,
        Provider.UNISWAP_V3,
        weth.address,
        amountIn
      )
      await expect(call).reverted
    })

    it('should quote same token to same token', async function () {
      const amountIn = parseEther('100')
      const {_amountOut} = await aggregator['quote(uint8,address,uint8,address,uint256)'](
        Provider.CHAINLINK,
        weth.address,
        Provider.UNISWAP_V3,
        weth.address,
        amountIn
      )
      expect(_amountOut).eq(amountIn)
    })

    it('should quote using NATIVE-USDC path', async function () {
      const {_amountOut} = await aggregator['quote(uint8,address,uint8,address,uint256)'](
        Provider.CHAINLINK,
        weth.address,
        Provider.UNISWAP_V3,
        usdc.address,
        parseEther('1')
      )
      expect(_amountOut).closeTo(parseUnits('3,230', 6), parseUnits('1', 6))
    })

    it('should quote using WBTC-NATIVE-USDC', async function () {
      const {_amountOut} = await aggregator['quote(uint8,address,uint8,address,uint256)'](
        Provider.UNISWAP_V3,
        wbtc.address,
        Provider.CHAINLINK,
        usdc.address,
        parseUnits('1', 8)
      )
      expect(_amountOut).closeTo(parseUnits('43,784', 6), parseUnits('1', 6))
    })
  })
})
