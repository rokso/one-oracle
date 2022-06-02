/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {deployments, ethers} from 'hardhat'
import {
  ChainlinkAvalanchePriceProvider__factory,
  PriceProvidersAggregator__factory,
  UmbrellaPriceProvider__factory,
  SynthOracle__factory,
  ChainlinkAvalanchePriceProvider,
  PriceProvidersAggregator,
  SynthOracle,
  UmbrellaPriceProvider,
  ERC20Mock,
  ERC20Mock__factory,
} from '../typechain-types'
import {Address, Provider} from '../helpers'
import {toUSD} from './helpers'

describe('Deployments ', function () {
  let snapshotId: string
  let deployer: SignerWithAddress

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer] = await ethers.getSigners()
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('@avalanche', function () {
    let chainlinkAvalanchePriceProvider: ChainlinkAvalanchePriceProvider
    let umbrellaPriceProvider: UmbrellaPriceProvider
    let priceProvidersAggregator: PriceProvidersAggregator
    let synthOracle: SynthOracle
    let vsETH: ERC20Mock

    const {WETH_ADDRESS} = Address.avalanche

    beforeEach(async function () {
      // eslint-disable-next-line no-shadow
      const {ChainlinkAvalanchePriceProvider, UmbrellaPriceProvider, PriceProvidersAggregator, SynthOracle} =
        await deployments.fixture()
      chainlinkAvalanchePriceProvider = ChainlinkAvalanchePriceProvider__factory.connect(
        ChainlinkAvalanchePriceProvider.address,
        deployer
      )
      umbrellaPriceProvider = UmbrellaPriceProvider__factory.connect(UmbrellaPriceProvider.address, deployer)
      priceProvidersAggregator = PriceProvidersAggregator__factory.connect(PriceProvidersAggregator.address, deployer)
      synthOracle = SynthOracle__factory.connect(SynthOracle.address, deployer)

      await umbrellaPriceProvider.updateKeyOfToken(WETH_ADDRESS, 'ETH-USD')

      const ERC20MockFactory = new ERC20Mock__factory(deployer)
      vsETH = await ERC20MockFactory.deploy('vsETH', 'vsETH')
      await synthOracle.addOrUpdateAsset(vsETH.address, WETH_ADDRESS)
    })

    it('ChainlinkAvalanchePriceProvider', async function () {
      const {_priceInUsd: price} = await chainlinkAvalanchePriceProvider.getPriceInUsd(WETH_ADDRESS)
      expect(price).eq(toUSD('3,251.6014'))
    })

    it('UmbrellaPriceProvider', async function () {
      const {_priceInUsd: price} = await umbrellaPriceProvider.getPriceInUsd(WETH_ADDRESS)
      expect(price).eq(toUSD('3,244.47'))
    })

    it('PriceProvidersAggregator', async function () {
      const {_priceInUsd: chainlinkPrice} = await priceProvidersAggregator.getPriceInUsd(
        Provider.CHAINLINK,
        WETH_ADDRESS
      )
      expect(chainlinkPrice).eq(toUSD('3,251.6014'))

      const {_priceInUsd: umbrellaPrice} = await priceProvidersAggregator.getPriceInUsd(
        Provider.UMBRELLA_FIRST_CLASS,
        WETH_ADDRESS
      )
      expect(umbrellaPrice).eq(toUSD('3,244.47'))
    })

    it('SynthOracle', async function () {
      const price = await synthOracle.getPriceInUsd(vsETH.address)
      expect(price).eq(toUSD('3,251.6014'))
    })
  })
})
