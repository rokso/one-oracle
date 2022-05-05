/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {
  UniswapV3PriceProvider,
  UniswapV3PriceProvider__factory,
  IERC20,
  IERC20__factory,
  UniswapV3CrossPoolOracle__factory,
  ChainlinkMainnetPriceProvider__factory,
  ChainlinkMainnetPriceProvider,
  Oracle,
  Oracle__factory,
  PriceProvidersAggregator__factory,
  PriceProvidersAggregator,
} from '../../typechain-types'
import Address from '../../helpers/address'
import {parseEther, parseUnits, HOUR, toUSD, Provider} from '../helpers'

const DEFAULT_TWAP_PERIOD = HOUR
const DEFAULT_POOLS_FEE = 3000 // 0.3%

const {WETH_ADDRESS, WBTC_ADDRESS, USDC_ADDRESS} = Address.mainnet

// Note: No need to cover all chains on this test
describe('Oracle @mainnet', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let governor: SignerWithAddress
  let usdc: IERC20
  let weth: IERC20
  let wbtc: IERC20
  let uniswapV3Provider: UniswapV3PriceProvider
  let chainlinkProvider: ChainlinkMainnetPriceProvider
  let providersAggregator: PriceProvidersAggregator
  let oracle: Oracle

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
      DEFAULT_POOLS_FEE
    )
    await uniswapV3Provider.deployed()
    await uniswapV3Provider.transferGovernorship(governor.address)
    await uniswapV3Provider.connect(governor).acceptGovernorship()

    const chainlinkProviderFactory = new ChainlinkMainnetPriceProvider__factory(deployer)
    chainlinkProvider = await chainlinkProviderFactory.deploy()
    await chainlinkProvider.deployed()

    const providersAggregatorFactory = new PriceProvidersAggregator__factory(deployer)
    providersAggregator = await providersAggregatorFactory.deploy(WETH_ADDRESS)
    await providersAggregator.deployed()

    await providersAggregator.setPriceProvider(Provider.UNISWAP_V3, uniswapV3Provider.address)
    await providersAggregator.setPriceProvider(Provider.CHAINLINK, chainlinkProvider.address)

    const oracleFactory = new Oracle__factory(deployer)
    oracle = await oracleFactory.deploy(providersAggregator.address)
    await oracle.deployed()
    await oracle.setDefaultProvider(Provider.CHAINLINK)
    await oracle.setUSDEquivalentToken(usdc.address)

    await oracle.transferGovernorship(governor.address)
    await oracle.connect(governor).acceptGovernorship()
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('setUSDEquivalentToken', function () {
    it('should revert if not governor', async function () {
      const tx = oracle.setUSDEquivalentToken(usdc.address)
      await expect(tx).revertedWith('not-governor')
    })

    it('should update USD token (allows null)', async function () {
      // given
      const before = await oracle.usdEquivalentToken()
      expect(before).eq(usdc.address)

      // when
      await oracle.connect(governor).setUSDEquivalentToken(ethers.constants.AddressZero)

      // then
      const after = await oracle.usdEquivalentToken()
      expect(after).eq(ethers.constants.AddressZero)
    })
  })

  describe('setDefaultProvider', function () {
    it('should revert if not governor', async function () {
      const tx = oracle.setDefaultProvider(Provider.UNISWAP_V3)
      await expect(tx).revertedWith('not-governor')
    })

    it('should update default provider (allows none)', async function () {
      // given
      const before = await oracle.defaultProvider()
      expect(before).eq(Provider.CHAINLINK)

      // when
      await oracle.connect(governor).setDefaultProvider(Provider.NONE)

      // then
      const after = await oracle.defaultProvider()
      expect(after).eq(Provider.NONE)
    })
  })

  describe('quoteTokenToUsd', function () {
    it('should revert when provider is not set', async function () {
      const call = oracle['quoteTokenToUsd(uint8,address,uint256)'](Provider.PANGOLIN, weth.address, parseEther('100'))
      await expect(call).reverted
    })

    it('should revert when USD token is not set and provider is not Chainlink', async function () {
      // given
      await oracle.connect(governor).setUSDEquivalentToken(ethers.constants.AddressZero)

      // when
      const amountIn = parseEther('100')
      const call = oracle['quoteTokenToUsd(uint8,address,uint256)'](Provider.UNISWAP_V3, weth.address, amountIn)

      // then
      await expect(call).reverted
    })

    it('should quote same token as USD equivalent', async function () {
      const amountIn = parseUnits('100', 6)
      const {_amountOut} = await oracle['quoteTokenToUsd(address,uint256)'](usdc.address, amountIn)
      expect(_amountOut).eq(toUSD('100'))
    })

    it('should quote using default provider', async function () {
      const {_amountOut} = await oracle['quoteTokenToUsd(address,uint256)'](wbtc.address, parseUnits('1', 8))
      expect(_amountOut).closeTo(toUSD('43,675'), toUSD('1'))
    })

    it('should quote using custom provider', async function () {
      const {_amountOut} = await oracle['quoteTokenToUsd(uint8,address,uint256)'](
        Provider.UNISWAP_V3,
        wbtc.address,
        parseUnits('1', 8)
      )
      expect(_amountOut).closeTo(toUSD('43,711'), toUSD('1'))
    })
  })

  describe('quoteUsdToToken', function () {
    it('should revert when provider is not set', async function () {
      const call = oracle['quoteUsdToToken(uint8,address,uint256)'](Provider.PANGOLIN, weth.address, parseEther('100'))
      await expect(call).reverted
    })

    it('should revert when USD token is not set and provider is not Chainlink', async function () {
      // given
      await oracle.connect(governor).setUSDEquivalentToken(ethers.constants.AddressZero)

      // when
      const amountIn = toUSD('100')
      const call = oracle['quoteUsdToToken(uint8,address,uint256)'](Provider.UNISWAP_V3, weth.address, amountIn)

      // then
      await expect(call).reverted
    })

    it('should quote same token as USD equivalent', async function () {
      const amountIn = toUSD('100')
      const {_amountOut} = await oracle['quoteUsdToToken(address,uint256)'](usdc.address, amountIn)
      expect(_amountOut).eq(parseUnits('100', 6))
    })

    it('should quote using default provider', async function () {
      const {_amountOut} = await oracle['quoteUsdToToken(address,uint256)'](wbtc.address, toUSD('43,675'))
      expect(_amountOut).closeTo(parseUnits('1', 8), parseUnits('0.1', 8))
    })

    it('should quote using custom provider', async function () {
      const {_amountOut} = await oracle['quoteUsdToToken(uint8,address,uint256)'](
        Provider.UNISWAP_V3,
        wbtc.address,
        toUSD('43,711')
      )
      expect(_amountOut).closeTo(parseUnits('1', 8), parseUnits('0.1', 8))
    })
  })
})
