/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {
  CTokenOracle,
  CTokenOracle__factory,
  ChainlinkMainnetPriceProvider__factory,
  ChainlinkMainnetPriceProvider,
} from '../../typechain-types'
import Address from '../../helpers/address'
import {toUSD} from '../helpers'

const {CDAI_ADDRESS, CUSDC_ADDRESS} = Address.mainnet

describe('CTokenOracle @mainnet', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let underlyingOracle: ChainlinkMainnetPriceProvider
  let ibOracle: CTokenOracle

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer] = await ethers.getSigners()

    const chainlinkProviderFactory = new ChainlinkMainnetPriceProvider__factory(deployer)
    underlyingOracle = await chainlinkProviderFactory.deploy()
    await underlyingOracle.deployed()

    const ibOracleFactory = new CTokenOracle__factory(deployer)
    ibOracle = await ibOracleFactory.deploy(underlyingOracle.address)
    await ibOracle.deployed()
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  it('getPriceInUsd (18 decimals underlying)', async function () {
    const price = await ibOracle.getPriceInUsd(CDAI_ADDRESS)
    expect(price).closeTo(toUSD('0.021'), toUSD('0.001')) // 1 cDAI ~= $0.021
  })

  it('getPriceInUsd (6 decimals underlying)', async function () {
    const price = await ibOracle.getPriceInUsd(CUSDC_ADDRESS)
    expect(price).closeTo(toUSD('0.022'), toUSD('0.001')) // 1 cUSDC ~= $0.022
  })
})
