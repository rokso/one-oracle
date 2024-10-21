/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {FakeContract, smock} from '@defi-wonderland/smock'
import {ChainlinkOracle} from '../../typechain-types'
import {Addresses} from '../../helpers/address'
import {parseEther} from '../helpers'
import Quote from '../helpers/quotes'

const STALE_PERIOD = ethers.constants.MaxUint256

const {DAI, WETH, WBTC} = Addresses.mainnet

describe('MainOracle @mainnet', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let provider: FakeContract
  let oracle: ChainlinkOracle

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer] = await ethers.getSigners()

    provider = await smock.fake('PriceProviderMock')

    const oracleProvider = await ethers.getContractFactory('MainOracle', deployer)
    oracle = await oracleProvider.deploy(provider.address, STALE_PERIOD)
    await oracle.deployed()
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  it('getPriceInUsd', async function () {
    const price = parseEther('1.02')
    provider.getPriceInUsd.returns(() => [price, 0])
    expect(await oracle.getPriceInUsd(DAI)).eq(price)
  })

  it('quote', async function () {
    const amountOut = parseEther('24,510.58')
    provider.quote.returns(() => [amountOut, 0, 0])
    expect(await oracle.quote(WBTC, DAI, parseEther('1'))).eq(amountOut)
  })

  it('quoteTokenToUsd', async function () {
    const amountOut = Quote.mainnet.BTC_USD
    provider.quoteTokenToUsd.returns(() => [amountOut, 0])
    expect(await oracle.quoteTokenToUsd(WBTC, parseEther('1'))).eq(amountOut)
  })

  it('quoteUsdToToken', async function () {
    const amountOut = Quote.mainnet.USD_ETH
    provider.quoteUsdToToken.returns(() => [amountOut, 0])
    expect(await oracle.quoteUsdToToken(WETH, parseEther('1'))).eq(amountOut)
  })
})
