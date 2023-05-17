/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {
  UniswapV3PriceProvider,
  IERC20,
  PriceProvidersAggregator,
  ChainlinkMainnetPriceProvider,
} from '../../typechain-types'
import {Addresses, Provider} from '../../helpers'
import {parseEther, parseUnits, HOUR} from '../helpers'
import {smock} from '@defi-wonderland/smock'
import Quote from '../helpers/quotes'

const DEFAULT_TWAP_PERIOD = HOUR
const DEFAULT_POOLS_FEE = 3000 // 0.3%

const {WETH, WBTC, USDC} = Addresses.mainnet

// Note: No need to cover all chains on this test
describe('PriceProvidersAggregator @mainnet', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let alice: SignerWithAddress
  let usdc: IERC20
  let weth: IERC20
  let wbtc: IERC20
  let uniswapV3Provider: UniswapV3PriceProvider
  let chainlinkProvider: ChainlinkMainnetPriceProvider
  let aggregator: PriceProvidersAggregator

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer, alice] = await ethers.getSigners()
    weth = await ethers.getContractAt('@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20', WETH, deployer)
    wbtc = await ethers.getContractAt('@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20', WBTC, deployer)
    usdc = await ethers.getContractAt('@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20', USDC, deployer)

    const addressProvider = await smock.fake('AddressProviderMock', {address: Addresses.ADDRESS_PROVIDER})
    addressProvider.governor.returns(deployer.address)

    const crossPoolOracleFactory = await ethers.getContractFactory('UniswapV3CrossPoolOracle', deployer)
    const crossPoolOracle = await crossPoolOracleFactory.deploy(weth.address)
    await crossPoolOracle.deployed()

    const uniswapV3ProviderFactory = await ethers.getContractFactory('UniswapV3PriceProvider', deployer)
    uniswapV3Provider = await uniswapV3ProviderFactory.deploy(
      crossPoolOracle.address,
      DEFAULT_TWAP_PERIOD,
      DEFAULT_POOLS_FEE
    )
    await uniswapV3Provider.deployed()

    const chainlinkProviderFactory = await ethers.getContractFactory('ChainlinkMainnetPriceProvider', deployer)
    chainlinkProvider = await chainlinkProviderFactory.deploy()
    await chainlinkProvider.deployed()

    const aggregatorProviderFactory = await ethers.getContractFactory('PriceProvidersAggregator', deployer)
    aggregator = await aggregatorProviderFactory.deploy(WETH)
    await aggregator.deployed()

    await aggregator.setPriceProvider(Provider.UNISWAP_V3, uniswapV3Provider.address)
    await aggregator.setPriceProvider(Provider.CHAINLINK, chainlinkProvider.address)
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('setPriceProvider', function () {
    it('should revert if not governor', async function () {
      const tx = aggregator.connect(alice).setPriceProvider(Provider.UNISWAP_V3, uniswapV3Provider.address)
      await expect(tx).revertedWith('not-governor')
    })

    it('should update price provider', async function () {
      // given
      const before = await aggregator.priceProviders(Provider.UNISWAP_V3)
      expect(before).eq(uniswapV3Provider.address)

      // when
      await aggregator.setPriceProvider(Provider.UNISWAP_V3, alice.address)

      // then
      const after = await aggregator.priceProviders(Provider.UNISWAP_V3)
      expect(after).eq(alice.address)
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
      expect(_amountOut).closeTo(Quote.mainnet.ETH_USD.div(`${1e12}`), parseUnits('10', 6))
    })

    it('should quote using WBTC-NATIVE-USDC', async function () {
      const {_amountOut} = await aggregator['quote(uint8,address,uint8,address,uint256)'](
        Provider.UNISWAP_V3,
        wbtc.address,
        Provider.CHAINLINK,
        usdc.address,
        parseUnits('1', 8)
      )
      expect(_amountOut).closeTo(Quote.mainnet.BTC_USD.div(`${1e12}`), parseUnits('150', 6))
    })
  })
})
