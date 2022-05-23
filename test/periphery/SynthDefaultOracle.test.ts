/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {
  ChainlinkAvalanchePriceProvider__factory,
  ChainlinkAvalanchePriceProvider,
  SynthDefaultOracle__factory,
  SynthDefaultOracle,
  ERC20Mock,
  ERC20Mock__factory,
  PriceProvidersAggregator,
  PriceProvidersAggregator__factory,
} from '../../typechain-types'
import Address from '../../helpers/address'
import {toUSD, HOUR, Provider, parseEther} from '../helpers'
import {BigNumber} from 'ethers'

const STALE_PERIOD = HOUR
const MAX_DEVIATION = parseEther('0.1') // 10%

const {WETH_ADDRESS, WBTC_ADDRESS, DAI_ADDRESS} = Address.avalanche

describe('SynthDefaultOracle @avalanche', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let governor: SignerWithAddress
  let vsBTC: ERC20Mock
  let vsUSD: ERC20Mock
  let vsETH: ERC20Mock
  let chainlinkProvider: ChainlinkAvalanchePriceProvider
  let aggregator: PriceProvidersAggregator
  let oracle: SynthDefaultOracle

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer, governor] = await ethers.getSigners()

    const erc20MockFactory = new ERC20Mock__factory(deployer)

    vsBTC = await erc20MockFactory.deploy('vsBTC', 'vsBTC')
    await vsBTC.deployed()
    vsUSD = await erc20MockFactory.deploy('vsUSD', 'vsUSD')
    await vsUSD.deployed()
    vsETH = await erc20MockFactory.deploy('vsETH', 'vsETH')
    await vsETH.deployed()

    const chainlinkProviderFactory = new ChainlinkAvalanchePriceProvider__factory(deployer)
    chainlinkProvider = await chainlinkProviderFactory.deploy()
    await chainlinkProvider.deployed()

    const aggregatorProviderFactory = new PriceProvidersAggregator__factory(deployer)
    aggregator = await aggregatorProviderFactory.deploy(WETH_ADDRESS)
    await aggregator.deployed()

    await aggregator.setPriceProvider(Provider.CHAINLINK, chainlinkProvider.address)

    const synthDefaultOracleFactory = new SynthDefaultOracle__factory(deployer)
    oracle = await synthDefaultOracleFactory.deploy(
      aggregator.address,
      MAX_DEVIATION,
      STALE_PERIOD,
      Provider.UMBRELLA_PASSPORT,
      Provider.FLUX
    )
    await oracle.deployed()
    await oracle.transferGovernorship(governor.address)
    await oracle.connect(governor).acceptGovernorship()
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('addOrUpdateAsset', function () {
    it('should revert if not governor', async function () {
      const tx = oracle.addOrUpdateAsset(vsBTC.address, WBTC_ADDRESS)
      await expect(tx).revertedWith('not-governor')
    })

    it('should add asset that uses Chainlink', async function () {
      // given
      const before = await oracle.assets(vsBTC.address)
      expect(before).deep.eq([ethers.constants.AddressZero, false])

      // when
      const underlyingAsset = WBTC_ADDRESS
      await oracle.connect(governor).addOrUpdateAsset(vsBTC.address, underlyingAsset)

      // then
      const after = await oracle.assets(vsBTC.address)
      expect(after).deep.eq([underlyingAsset, false])
    })
  })

  describe('addOrUpdateUsdAsset', function () {
    it('should revert if not governor', async function () {
      const tx = oracle.addOrUpdateUsdAsset(vsUSD.address)
      await expect(tx).revertedWith('not-governor')
    })

    it('should update default provider (allows none)', async function () {
      // given
      const before = await oracle.assets(vsUSD.address)
      expect(before).deep.eq([ethers.constants.AddressZero, false])

      // when
      await oracle.connect(governor).addOrUpdateUsdAsset(vsUSD.address)

      // then
      const after = await oracle.assets(vsUSD.address)
      expect(after).deep.eq([ethers.constants.AddressZero, true])
    })
  })

  describe('getPriceInUsd', function () {
    beforeEach(async function () {
      await oracle.connect(governor).addOrUpdateAsset(vsBTC.address, WBTC_ADDRESS)
      await oracle.connect(governor).addOrUpdateAsset(vsETH.address, WETH_ADDRESS)
      await oracle.connect(governor).addOrUpdateUsdAsset(vsUSD.address)
    })

    it('should revert when asset is not set', async function () {
      const call = oracle.getPriceInUsd(DAI_ADDRESS)
      await expect(call).reverted
    })

    it('should get vsETH price', async function () {
      const priceInUsd = await oracle.getPriceInUsd(vsETH.address)
      expect(priceInUsd).closeTo(toUSD('3,251'), toUSD('1'))
    })

    it('should get vsBTC price', async function () {
      const priceInUsd = await oracle.getPriceInUsd(vsBTC.address)
      expect(priceInUsd).closeTo(toUSD('42,794'), toUSD('1'))
    })

    it('should get vsUSD price (always 1)', async function () {
      const priceInUsd = await oracle.getPriceInUsd(vsUSD.address)
      expect(priceInUsd).eq(toUSD('1'))
    })
  })
})
