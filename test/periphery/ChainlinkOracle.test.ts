/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {FakeContract, smock} from '@defi-wonderland/smock'
import {ChainlinkOracle, ChainlinkOracle__factory} from '../../typechain-types'
import {Addresses} from '../../helpers/address'
import {parseEther} from '../helpers'
import Quote from '../helpers/quotes'

const STALE_PERIOD = ethers.constants.MaxUint256

const {DAI, WETH, WBTC} = Addresses.mainnet

describe('ChainlinkOracle @mainnet', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let aggregator: FakeContract
  let oracle: ChainlinkOracle

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer] = await ethers.getSigners()

    aggregator = await smock.fake('PriceProvidersAggregator')

    const oracleProvider = new ChainlinkOracle__factory(deployer)
    oracle = await oracleProvider.deploy(STALE_PERIOD)
    await oracle.deployed()

    const addressProvider = await smock.fake('AddressProviderMock', {address: Addresses.ADDRESS_PROVIDER})
    // addressProvider.governor.returns(deployer.address)
    addressProvider.providersAggregator.returns(aggregator.address)
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  it('getPriceInUsd', async function () {
    const price = parseEther('1.02')
    aggregator.getPriceInUsd.returns(() => [price, 0])
    expect(await oracle.getPriceInUsd(DAI)).eq(price)
  })

  it('quote', async function () {
    const amountOut = parseEther('24,510.58')
    aggregator['quote(uint8,address,address,uint256)'].returns(() => [amountOut, 0, 0])
    expect(await oracle.quote(WBTC, DAI, parseEther('1'))).eq(amountOut)
  })

  it('quoteTokenToUsd', async function () {
    const amountOut = Quote.mainnet.BTC_USD
    aggregator.quoteTokenToUsd.returns(() => [amountOut, 0])
    expect(await oracle.quoteTokenToUsd(WBTC, parseEther('1'))).eq(amountOut)
  })

  it('quoteUsdToToken', async function () {
    const amountOut = Quote.mainnet.USD_ETH
    aggregator.quoteUsdToToken.returns(() => [amountOut, 0])
    expect(await oracle.quoteUsdToToken(WETH, parseEther('1'))).eq(amountOut)
  })
})
