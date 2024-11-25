/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {ChainlinkPriceProvider, MainAndFallbackOracle, RedstoneMainnetPriceProvider} from '../typechain-types'
import {Addresses} from '../helpers'
import {increaseTime, parseEther, timestampFromLatestBlock} from './helpers'
import {WrapperBuilder} from '@redstone-finance/evm-connector'
import {smock} from '@defi-wonderland/smock'

const STALE_PERIOD = ethers.constants.MaxUint256

const ETH_USD_FEED_ID = ethers.utils.formatBytes32String('ETH') // i.e., bytes32("ETH")

const {
  WETH,
  WEETH,
  Redstone: {REDSTONE_WEETH_USD_AGGREGATOR},
} = Addresses.mainnet

describe('RedstonePullAndPush @mainnet', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let alice: SignerWithAddress
  let pushProvider: ChainlinkPriceProvider
  let pullProvider: RedstoneMainnetPriceProvider
  let oracle: MainAndFallbackOracle

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer, alice] = await ethers.getSigners()

    const addressProvider = await smock.fake('AddressProviderMock', {address: Addresses.ADDRESS_PROVIDER})
    addressProvider.governor.returns(deployer.address)

    const redstonePushPriceProviderFactory = await ethers.getContractFactory('ChainlinkPriceProvider', deployer)
    pushProvider = await redstonePushPriceProviderFactory.deploy()
    await pushProvider.deployed()

    const redstonePullPriceProviderFactory = await ethers.getContractFactory('RedstoneMainnetPriceProvider', deployer)
    pullProvider = await redstonePullPriceProviderFactory.deploy()
    await pullProvider.deployed()

    const factory = await ethers.getContractFactory('MainAndFallbackOracle', deployer)
    oracle = await factory.deploy(pullProvider.address, pushProvider.address, STALE_PERIOD)
    await oracle.deployed()

    await pushProvider.updateAggregator(WEETH, REDSTONE_WEETH_USD_AGGREGATOR)
    // when (update cache)
    const wrappedPriceProvider = WrapperBuilder.wrap(pullProvider).usingDataService({
      dataPackagesIds: ['ETH', 'USDC', 'BTC'],
    })
    await wrappedPriceProvider.updatePrice([ETH_USD_FEED_ID])

    // Change block time to current timestamp
    const currentTimestamp = parseInt((Date.now() / 1000).toFixed())
    const blockTimestamp = await timestampFromLatestBlock()
    const toIncrease = currentTimestamp - blockTimestamp
    await increaseTime(ethers.BigNumber.from(toIncrease))

    expect(await pullProvider.getPriceInUsd(WEETH)).deep.eq([0, 0]) // Redstone pull provider doesn't revert
    await expect(pushProvider.getPriceInUsd(WETH)).reverted
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  it('getPriceInUsd', async function () {
    expect(await oracle.getPriceInUsd(WETH)).gt(0)
    expect(await oracle.getPriceInUsd(WEETH)).gt(0)
  })

  it('quote', async function () {
    expect(await oracle.quote(WETH, WEETH, parseEther('1'))).gt(0)
    expect(await oracle.quote(WEETH, WETH, parseEther('1'))).gt(0)
  })

  it('quoteTokenToUsd', async function () {
    expect(await oracle.getPriceInUsd(WETH)).eq(await oracle.quoteTokenToUsd(WETH, parseEther('1')))
    expect(await oracle.getPriceInUsd(WEETH)).eq(await oracle.quoteTokenToUsd(WEETH, parseEther('1')))
  })

  it('quoteUsdToToken', async function () {
    expect(await oracle.quoteUsdToToken(WETH, parseEther('2500'))).gt(0)
    expect(await oracle.quoteUsdToToken(WEETH, parseEther('2500'))).gt(0)
  })
})
