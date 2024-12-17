/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import hre, {deployments, ethers} from 'hardhat'
import {
  ChainlinkAvalanchePriceProvider,
  PriceProvidersAggregator,
  VspMainnetOracle,
  ChainlinkOracle,
  USDPeggedTokenOracle,
  MasterOracle,
} from '../typechain-types'
import {Addresses, Provider} from '../helpers'
import {impersonateAccount, increaseTime, parseEther, resetFork, toUSD} from './helpers'
import {adjustBalance} from './helpers/balance'
import Quote from './helpers/quotes'

const AddressProvider = 'IAddressProvider'

describe('Deployments ', function () {
  let snapshotId: string
  let deployer: SignerWithAddress

  before(async function () {
    // Reset fork to clean up fake `AddressProvider` contract from other test suites
    await resetFork()
  })

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    deployer = await impersonateAccount(Addresses.DEPLOYER)
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('@avalanche', function () {
    let chainlinkPriceProvider: ChainlinkAvalanchePriceProvider
    let priceProvidersAggregator: PriceProvidersAggregator
    let chainlinkOracle: ChainlinkOracle
    let msUsdOracle: USDPeggedTokenOracle

    const {WETH} = Addresses.avalanche

    beforeEach(async function () {
      // Setting the folder to execute deployment scripts from
      hre.network.deploy = ['deploy/avalanche']

      // eslint-disable-next-line no-shadow
      const {ChainlinkPriceProvider, PriceProvidersAggregator, ChainlinkOracle, USDPeggedTokenOracle} =
        await deployments.fixture()

      chainlinkPriceProvider = await ethers.getContractAt(
        'ChainlinkAvalanchePriceProvider',
        ChainlinkPriceProvider.address,
        deployer
      )
      priceProvidersAggregator = await ethers.getContractAt(
        'PriceProvidersAggregator',
        PriceProvidersAggregator.address,
        deployer
      )
      chainlinkOracle = await ethers.getContractAt('ChainlinkOracle', ChainlinkOracle.address, deployer)
      msUsdOracle = await ethers.getContractAt('USDPeggedTokenOracle', USDPeggedTokenOracle.address, deployer)
    })

    it('ChainlinkPriceProvider', async function () {
      const {_priceInUsd: price} = await chainlinkPriceProvider.getPriceInUsd(WETH)
      expect(price).closeTo(Quote.avalanche.ETH_USD, toUSD('1'))
    })

    it('PriceProvidersAggregator', async function () {
      const {_priceInUsd: priceInUsd} = await priceProvidersAggregator.getPriceInUsd(Provider.CHAINLINK, WETH)
      expect(priceInUsd).closeTo(Quote.avalanche.ETH_USD, toUSD('1'))
    })

    it('ChainlinkOracle', async function () {
      const priceInUsd = await chainlinkOracle.getPriceInUsd(WETH)
      expect(priceInUsd).closeTo(Quote.avalanche.ETH_USD, toUSD('1'))
    })

    it('USDPeggedTokenOracle', async function () {
      // Should always return 1 USD no matter the address given
      const priceInUsd = await msUsdOracle.getPriceInUsd(ethers.constants.AddressZero)
      expect(priceInUsd).eq(toUSD('1'))
    })
  })

  describe('@base', function () {
    let chainlinkPriceProvider: ChainlinkAvalanchePriceProvider
    let priceProvidersAggregator: PriceProvidersAggregator
    let chainlinkOracle: ChainlinkOracle

    const {WETH} = Addresses.base

    beforeEach(async function () {
      // Setting the folder to execute deployment scripts from
      hre.network.deploy = ['deploy/base']
      // eslint-disable-next-line no-shadow
      const {ChainlinkPriceProvider, PriceProvidersAggregator, ChainlinkOracle} = await deployments.fixture()
      chainlinkPriceProvider = await ethers.getContractAt(
        'ChainlinkAvalanchePriceProvider',
        ChainlinkPriceProvider.address,
        deployer
      )
      priceProvidersAggregator = await ethers.getContractAt(
        'PriceProvidersAggregator',
        PriceProvidersAggregator.address,
        deployer
      )
      chainlinkOracle = await ethers.getContractAt('ChainlinkOracle', ChainlinkOracle.address, deployer)
    })

    it('ChainlinkPriceProvider', async function () {
      const {_priceInUsd: price} = await chainlinkPriceProvider.getPriceInUsd(WETH)
      expect(price).closeTo(Quote.base.ETH_USD, toUSD('1'))
    })

    it('PriceProvidersAggregator', async function () {
      const {_priceInUsd: priceInUsd} = await priceProvidersAggregator.getPriceInUsd(Provider.CHAINLINK, WETH)
      expect(priceInUsd).closeTo(Quote.base.ETH_USD, toUSD('1'))
    })

    it('ChainlinkOracle', async function () {
      const priceInUsd = await chainlinkOracle.getPriceInUsd(WETH)
      expect(priceInUsd).closeTo(Quote.base.ETH_USD, toUSD('1'))
    })
  })

  describe('@mainnet', function () {
    let vspOracle: VspMainnetOracle

    const {WETH, VSP} = Addresses.mainnet

    beforeEach(async function () {
      // Setting the folder to execute deployment scripts from
      hre.network.deploy = ['deploy/mainnet']

      // eslint-disable-next-line no-shadow
      const {VspOracle} = await deployments.fixture()

      vspOracle = await ethers.getContractAt('VspMainnetOracle', VspOracle.address, deployer)

      await adjustBalance(WETH, deployer.address, parseEther('1000'))
    })

    it('VspMainnetOracle', async function () {
      // given
      await increaseTime(ethers.BigNumber.from(60 * 60 * 3))
      await vspOracle.update()

      // when
      const price = await vspOracle.getPriceInUsd(VSP)

      // then
      expect(price).closeTo(Quote.mainnet.VSP_USD, parseEther('0.01'))
    })
  })

  describe('@optimism', function () {
    let priceProvidersAggregator: PriceProvidersAggregator
    let chainlinkOracle: ChainlinkOracle
    let msUsdOracle: USDPeggedTokenOracle

    const {WETH, DAI, USDC, OP} = Addresses.optimism

    beforeEach(async function () {
      // Setting the folder to execute deployment scripts from
      hre.network.deploy = ['deploy/optimism']

      // eslint-disable-next-line no-shadow
      const {PriceProvidersAggregator, ChainlinkOracle, USDPeggedTokenOracle} = await deployments.fixture()

      priceProvidersAggregator = await ethers.getContractAt(
        'PriceProvidersAggregator',
        PriceProvidersAggregator.address,
        deployer
      )
      chainlinkOracle = await ethers.getContractAt('ChainlinkOracle', ChainlinkOracle.address, deployer)
      msUsdOracle = await ethers.getContractAt('USDPeggedTokenOracle', USDPeggedTokenOracle.address, deployer)

      // AddressProvider governor can update priceProvidersAggregator if not already set.
      const addressProvider = await ethers.getContractAt(AddressProvider, Addresses.ADDRESS_PROVIDER)
      if (
        (await addressProvider.governor()) === Addresses.DEPLOYER &&
        (await addressProvider.providersAggregator()) !== priceProvidersAggregator.address
      ) {
        await addressProvider.connect(deployer).updateProvidersAggregator(priceProvidersAggregator.address)
      }

      await adjustBalance(WETH, deployer.address, parseEther('1000'))
    })

    it('PriceProvidersAggregator', async function () {
      const {_priceInUsd: priceInUsd} = await priceProvidersAggregator.getPriceInUsd(Provider.CHAINLINK, WETH)
      expect(priceInUsd).closeTo(Quote.optimism.ETH_USD, toUSD('1'))

      const {_priceInUsd: usdcPriceInUsd} = await priceProvidersAggregator.getPriceInUsd(Provider.CHAINLINK, USDC)
      expect(usdcPriceInUsd).closeTo(Quote.optimism.USDC_USD, toUSD('0.1'))

      const {_priceInUsd: daiPriceInUsd} = await priceProvidersAggregator.getPriceInUsd(Provider.CHAINLINK, DAI)
      expect(daiPriceInUsd).closeTo(Quote.optimism.DAI_USD, toUSD('0.1'))

      const {_priceInUsd: opPriceInUsd} = await priceProvidersAggregator.getPriceInUsd(Provider.CHAINLINK, OP)
      expect(opPriceInUsd).closeTo(Quote.optimism.OP_USD, toUSD('0.1'))
    })

    it('ChainlinkOracle', async function () {
      const priceInUsd = await chainlinkOracle.getPriceInUsd(WETH)
      expect(priceInUsd).closeTo(Quote.optimism.ETH_USD, toUSD('1'))

      const usdcPriceInUsd = await chainlinkOracle.getPriceInUsd(USDC)
      expect(usdcPriceInUsd).closeTo(Quote.optimism.USDC_USD, toUSD('0.1'))

      const daiPriceInUsd = await chainlinkOracle.getPriceInUsd(DAI)
      expect(daiPriceInUsd).closeTo(Quote.optimism.DAI_USD, toUSD('0.1'))

      const opPriceInUsd = await chainlinkOracle.getPriceInUsd(OP)
      expect(opPriceInUsd).closeTo(Quote.optimism.OP_USD, toUSD('0.1'))
    })

    it('USDPeggedTokenOracle', async function () {
      // Should always return 1 USD no matter the address given
      const priceInUsd = await msUsdOracle.getPriceInUsd(ethers.constants.AddressZero)
      expect(priceInUsd).eq(toUSD('1'))
    })
  })

  describe('@swell', function () {
    let masterOracle: MasterOracle

    const {
      WETH,
      Synth: {msETH},
    } = Addresses.swell

    beforeEach(async function () {
      // Setting the folder to execute deployment scripts from
      hre.network.deploy = ['deploy/swell']

      // eslint-disable-next-line no-shadow
      const {MasterOracle} = await deployments.fixture()

      masterOracle = await ethers.getContractAt('MasterOracle', MasterOracle.address, deployer)
    })

    describe('MasterOracle', function () {
      it('WETH', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(WETH)

        // then
        expect(price).closeTo(Quote.swell.ETH_USD, parseEther('1'))
      })

      it('msETH', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(msETH)

        // then
        expect(price).closeTo(Quote.swell.ETH_USD, parseEther('1'))
      })
    })
  })
})
