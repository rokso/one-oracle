/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {
  ChainlinkAvalanchePriceProvider__factory,
  ChainlinkAvalanchePriceProvider,
  SynthOracle__factory,
  SynthOracle,
  ERC20Mock,
  ERC20Mock__factory,
  PriceProvidersAggregator,
  PriceProvidersAggregator__factory,
} from '../../typechain-types'
import {Address, Provider} from '../../helpers'
import {toUSD, HOUR, parseEther, parseUnits} from '../helpers'
import {smock} from '@defi-wonderland/smock'

const STALE_PERIOD = HOUR
const MAX_DEVIATION = parseEther('0.1') // 10%

const {WETH_ADDRESS, WBTC_ADDRESS, DAI_ADDRESS} = Address.avalanche

describe('SynthOracle @avalanche', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let alice: SignerWithAddress
  let vsBTC: ERC20Mock
  let vsUSD: ERC20Mock
  let vsETH: ERC20Mock
  let chainlinkProvider: ChainlinkAvalanchePriceProvider
  let aggregator: PriceProvidersAggregator
  let oracle: SynthOracle

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer, alice] = await ethers.getSigners()

    const addressProvider = await smock.fake('AddressProvider', {address: Address.ADDRESS_PROVIDER})
    addressProvider.governor.returns(deployer.address)

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

    addressProvider.providersAggregator.returns(aggregator.address)

    const synthDefaultOracleFactory = new SynthOracle__factory(deployer)
    oracle = await synthDefaultOracleFactory.deploy(
      MAX_DEVIATION,
      STALE_PERIOD,
      Provider.UMBRELLA_PASSPORT,
      Provider.FLUX
    )
    await oracle.deployed()
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('addOrUpdateAsset', function () {
    it('should revert if not governor', async function () {
      const tx = oracle.connect(alice).addOrUpdateAsset(vsBTC.address, WBTC_ADDRESS)
      await expect(tx).revertedWith('not-governor')
    })

    it('should add asset that uses Chainlink', async function () {
      // given
      const before = await oracle.assets(vsBTC.address)
      expect(before).deep.eq([ethers.constants.AddressZero, false])

      // when
      const underlyingAsset = WBTC_ADDRESS
      await oracle.addOrUpdateAsset(vsBTC.address, underlyingAsset)

      // then
      const after = await oracle.assets(vsBTC.address)
      expect(after).deep.eq([underlyingAsset, false])
    })
  })

  describe('addOrUpdateUsdAsset', function () {
    it('should revert if not governor', async function () {
      const tx = oracle.connect(alice).addOrUpdateUsdAsset(vsUSD.address)
      await expect(tx).revertedWith('not-governor')
    })

    it('should update default provider (allows none)', async function () {
      // given
      const before = await oracle.assets(vsUSD.address)
      expect(before).deep.eq([ethers.constants.AddressZero, false])

      // when
      await oracle.addOrUpdateUsdAsset(vsUSD.address)

      // then
      const after = await oracle.assets(vsUSD.address)
      expect(after).deep.eq([ethers.constants.AddressZero, true])
    })
  })

  describe('when have assets setup', function () {
    beforeEach(async function () {
      await oracle.addOrUpdateAsset(vsBTC.address, WBTC_ADDRESS)
      await oracle.addOrUpdateAsset(vsETH.address, WETH_ADDRESS)
      await oracle.addOrUpdateUsdAsset(vsUSD.address)
    })

    describe('getPriceInUsd', function () {
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

    describe('quote', function () {
      it('should revert when asset is not set', async function () {
        const call = oracle.quote(vsBTC.address, DAI_ADDRESS, parseUnits('1', 8))
        await expect(call).reverted
      })

      it('should get vsETH-vsUSD price', async function () {
        const amountOut = await oracle.quote(vsETH.address, vsUSD.address, parseEther('1'))
        expect(amountOut).closeTo(toUSD('3,251'), toUSD('1'))
      })

      it('should get vsBTC-vsETH price', async function () {
        const amountOut = await oracle.quote(vsBTC.address, vsETH.address, parseUnits('1', 8))
        expect(amountOut).closeTo(parseEther('13.1'), parseEther('0.1'))
      })

      it('should get vsUSD-vsETH price', async function () {
        const amountOut = await oracle.quote(vsUSD.address, vsETH.address, toUSD('3,251'))
        expect(amountOut).closeTo(parseEther('1'), parseEther('0.01'))
      })
    })

    describe('quoteTokenToUsd', function () {
      it('should revert when asset is not set', async function () {
        const call = oracle.quoteTokenToUsd(DAI_ADDRESS, parseEther('1'))
        await expect(call).reverted
      })

      it('should get vsETH price', async function () {
        const amountOut = await oracle.quoteTokenToUsd(vsETH.address, parseEther('1'))
        expect(amountOut).closeTo(toUSD('3,251'), toUSD('1'))
      })

      it('should get vsBTC price', async function () {
        const amountOut = await oracle.quoteTokenToUsd(vsBTC.address, parseUnits('1', 8))
        expect(amountOut).closeTo(toUSD('42,794'), toUSD('1'))
      })

      it('should get vsUSD price (always 1)', async function () {
        const amountOut = await oracle.quoteTokenToUsd(vsUSD.address, parseEther('1'))
        expect(amountOut).eq(toUSD('1'))
      })
    })

    describe('quoteUsdToToken', function () {
      it('should revert when asset is not set', async function () {
        const call = oracle.quoteUsdToToken(DAI_ADDRESS, parseEther('1'))
        await expect(call).reverted
      })

      it('should get vsETH price', async function () {
        const amountOut = await oracle.quoteUsdToToken(vsETH.address, toUSD('3,251'))
        expect(amountOut).closeTo(parseEther('1'), parseEther('0.1'))
      })

      it('should get vsBTC price', async function () {
        const amountOut = await oracle.quoteUsdToToken(vsBTC.address, toUSD('42,794'))
        expect(amountOut).closeTo(parseUnits('1', 8), parseUnits('0.1', 8))
      })

      it('should get vsUSD price (always 1)', async function () {
        const amountOut = await oracle.quoteUsdToToken(vsUSD.address, parseEther('1'))
        expect(amountOut).eq(toUSD('1'))
      })
    })
  })
})
