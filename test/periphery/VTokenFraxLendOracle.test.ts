/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {VTokenFraxLendOracle__factory} from '../../typechain-types'
import {Addresses} from '../../helpers'
import Quote from '../helpers/quotes'
import {parseUnits} from '../helpers'

const {
  Vesper: {vaDAI, vaETH, vaFRAX, vaLINK, vaUSDC, vaWBTC, vastETH},
  Chainlink: {
    CHAINLINK_USDC_USD_AGGREGATOR,
    CHAINLINK_DAI_USD_AGGREGATOR,
    CHAINLINK_FRAX_USD_AGGREGATOR,
    CHAINLINK_ETH_USD_AGGREGATOR,
    CHAINLINK_BTC_USD_AGGREGATOR,
    CHAINLINK_LINK_USD_AGGREGATOR,
    CHAINLINK_STETH_USD_AGGREGATOR,
  },
} = Addresses.mainnet

describe('VTokenFraxLendOracle @mainnet', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let oracleFactory: VTokenFraxLendOracle__factory

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer] = await ethers.getSigners()
    oracleFactory = await ethers.getContractFactory('VTokenFraxLendOracle', deployer)
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('getPriceInUsd', function () {
    it('should get price for vaUSDC', async function () {
      const oracle = await oracleFactory.deploy(CHAINLINK_USDC_USD_AGGREGATOR, vaUSDC)
      const {answer: price} = await oracle.latestRoundData()
      expect(price).closeTo(Quote.mainnet.vaUSDC_USD.div(`${1e10}`), parseUnits('0.01', 8))
    })

    it('should get price for vaDAI', async function () {
      const oracle = await oracleFactory.deploy(CHAINLINK_DAI_USD_AGGREGATOR, vaDAI)
      const {answer: price} = await oracle.latestRoundData()
      expect(price).closeTo(Quote.mainnet.vaDAI_USD.div(`${1e10}`), parseUnits('0.01', 8))
    })

    it('should get price for vaFRAX', async function () {
      const oracle = await oracleFactory.deploy(CHAINLINK_FRAX_USD_AGGREGATOR, vaFRAX)
      const {answer: price} = await oracle.latestRoundData()
      expect(price).closeTo(Quote.mainnet.vaFRAX_USD.div(`${1e10}`), parseUnits('0.01', 8))
    })

    it('should get price for vaETH', async function () {
      const oracle = await oracleFactory.deploy(CHAINLINK_ETH_USD_AGGREGATOR, vaETH)
      const {answer: price} = await oracle.latestRoundData()
      expect(price).closeTo(Quote.mainnet.vaETH_USD.div(`${1e10}`), parseUnits('1', 8))
    })

    it('should get price for vastETH', async function () {
      const oracle = await oracleFactory.deploy(CHAINLINK_STETH_USD_AGGREGATOR, vastETH)
      const {answer: price} = await oracle.latestRoundData()
      expect(price).closeTo(Quote.mainnet.vastETH_USD.div(`${1e10}`), parseUnits('15', 8))
    })

    it('should get price for vaWBTC', async function () {
      const oracle = await oracleFactory.deploy(CHAINLINK_BTC_USD_AGGREGATOR, vaWBTC)
      const {answer: price} = await oracle.latestRoundData()
      expect(price).closeTo(Quote.mainnet.vaWBTC_USD.div(`${1e10}`), parseUnits('1', 8))
    })

    it('should get price for vaLINK', async function () {
      const oracle = await oracleFactory.deploy(CHAINLINK_LINK_USD_AGGREGATOR, vaLINK)
      const {answer: price} = await oracle.latestRoundData()
      expect(price).closeTo(Quote.mainnet.vaLINK_USD.div(`${1e10}`), parseUnits('0.1', 8))
    })
  })
})
