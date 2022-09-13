/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {
  CurveLpTokenOracle,
  CurveLpTokenOracle__factory,
  CurveFactoryLpTokenOracle,
  CurveFactoryLpTokenOracle__factory,
  ChainlinkMainnetPriceProvider__factory,
  ChainlinkOracleMock,
  ChainlinkOracleMock__factory,
  MasterOracle,
  MasterOracle__factory,
  MStableTokenOracle__factory,
  BTCPeggedTokenOracle__factory,
  IbBtcTokenOracle__factory,
  AlusdTokenMainnetOracle__factory,
  ATokenOracle__factory,
  CTokenOracle__factory,
  ChainlinkAvalanchePriceProvider__factory,
  ChainlinkArbitrumPriceProvider__factory,
  ChainlinkOracle__factory,
  ChainlinkOracle,
  PriceProvidersAggregator__factory,
  SynthUsdTokenOracle__factory,
  ChainlinkAvalanchePriceProvider,
  YEarnTokenOracle__factory,
} from '../../typechain-types'
import Address from '../../helpers/address'
import {parseEther, timestampFromLatestBlock, toUSD} from '../helpers'
import {FakeContract, smock} from '@defi-wonderland/smock'
import {Provider} from '../../helpers'

const STALE_PERIOD = ethers.constants.MaxUint256

describe('MasterOracle', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let masterOracle: MasterOracle
  let addressProvider: FakeContract

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer] = await ethers.getSigners()

    addressProvider = await smock.fake('AddressProvider', {address: Address.ADDRESS_PROVIDER})
    addressProvider.governor.returns(deployer.address)
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('MasterOracle @mainnet', function () {
    let chainlinkOracle: ChainlinkOracleMock

    const {
      DAI_ADDRESS,
      CHAINLINK_BTC_USD_AGGREGATOR,
      RENBTC_ADDRESS,
      SBTC_ADDRESS,
      TRICRV_ADDRESS,
      ALUSD_ADDRESS,
      WIBBTC_ADDRESS,
      MUSD_ADDRESS,
      CURVE_SBTC_LP,
      CURVE_MIM_3CRV_LP,
      CURVE_SUSD_LP,
      CURVE_D3_LP,
      CURVE_FRAX_3CRV_LP,
      CURVE_IBBTC_SBTC_LP,
      CURVE_MUSD_LP,
      ADAI_ADDRESS,
      AUSDC_ADDRESS,
      AUSDT_ADDRESS,
      CURVE_AAVE_LP,
      CDAI_ADDRESS,
      CUSDC_ADDRESS,
      CETH_ADDRESS,
      WETH_ADDRESS,
      BUSD_ADDRESS,
      USDP_ADDRESS,
      CHAINLINK_BUSD_USD_AGGREGATOR,
      CHAINLINK_USDP_USD_AGGREGATOR,
      CURVE_BUSD_LP,
      CURVE_BUSD_POOL,
      CURVE_PAX_LP,
      CURVE_PAX_POOL,
      CURVE_Y_LP,
      CURVE_Y_POOL,
      CURVE_COMPOUND_LP,
      CURVE_USDT_LP,
    } = Address.mainnet

    beforeEach(async function () {
      const chainlinkPriceProviderFactory = new ChainlinkMainnetPriceProvider__factory(deployer)
      const chainlinkPriceProvider = await chainlinkPriceProviderFactory.deploy()
      await chainlinkPriceProvider.deployed()
      await chainlinkPriceProvider.updateAggregator(BUSD_ADDRESS, CHAINLINK_BUSD_USD_AGGREGATOR)
      await chainlinkPriceProvider.updateAggregator(USDP_ADDRESS, CHAINLINK_USDP_USD_AGGREGATOR)

      const chainlinkOracleMockFactory = new ChainlinkOracleMock__factory(deployer)
      chainlinkOracle = await chainlinkOracleMockFactory.deploy(chainlinkPriceProvider.address)
      await chainlinkOracle.deployed()

      const masterOracleFactory = new MasterOracle__factory(deployer)
      masterOracle = await masterOracleFactory.deploy(chainlinkOracle.address)
      await masterOracle.deployed()

      const cTokenOracleFactory = new CTokenOracle__factory(deployer)
      const cTokenOracle = await cTokenOracleFactory.deploy(WETH_ADDRESS)
      await cTokenOracle.deployed()

      await masterOracle.updateTokenOracle(CDAI_ADDRESS, cTokenOracle.address)
      await masterOracle.updateTokenOracle(CUSDC_ADDRESS, cTokenOracle.address)
      await masterOracle.updateTokenOracle(CETH_ADDRESS, cTokenOracle.address)
    })

    describe('getPriceInUsd', function () {
      it('should revert if token oracle returns 0', async function () {
        // given
        const daiFakeOracle = await smock.fake('ITokenOracle')
        daiFakeOracle.getPriceInUsd.returns(0)
        await masterOracle.updateTokenOracle(DAI_ADDRESS, daiFakeOracle.address)

        // when-then
        expect(masterOracle.getPriceInUsd(DAI_ADDRESS)).to.revertedWith('invalid-token-price')
      })
    })

    describe('Curve LP Tokens', function () {
      let curveLpTokenOracle: CurveLpTokenOracle
      let curveLpFactoryTokenOracle: CurveFactoryLpTokenOracle

      beforeEach(async function () {
        const curveLpTokenOracleFactory = new CurveLpTokenOracle__factory(deployer)
        curveLpTokenOracle = await curveLpTokenOracleFactory.deploy()
        await curveLpTokenOracle.deployed()

        const curveLpFactoryTokenOracleFactory = new CurveFactoryLpTokenOracle__factory(deployer)
        curveLpFactoryTokenOracle = await curveLpFactoryTokenOracleFactory.deploy()
        await curveLpFactoryTokenOracle.deployed()

        // 3Crv (DAI+USDC+USDT)
        await curveLpTokenOracle.registerPool(TRICRV_ADDRESS)
        await masterOracle.updateTokenOracle(TRICRV_ADDRESS, curveLpTokenOracle.address)

        // MIM+3Crv
        await curveLpTokenOracle.registerPool(CURVE_MIM_3CRV_LP)
        await masterOracle.updateTokenOracle(CURVE_MIM_3CRV_LP, curveLpTokenOracle.address)

        // FRAX+3Crv
        await curveLpTokenOracle.registerPool(CURVE_FRAX_3CRV_LP)
        await masterOracle.updateTokenOracle(CURVE_FRAX_3CRV_LP, curveLpTokenOracle.address)

        // sUSD+DAI+USDC+USDT
        await curveLpTokenOracle.registerPool(CURVE_SUSD_LP)
        await masterOracle.updateTokenOracle(CURVE_SUSD_LP, curveLpTokenOracle.address)

        // mUSD+DAI+USDC+USDT
        const mStableTokenOracleFactory = new MStableTokenOracle__factory(deployer)
        const mStableTokenOracle = await mStableTokenOracleFactory.deploy()
        await mStableTokenOracle.deployed()

        await masterOracle.updateTokenOracle(MUSD_ADDRESS, mStableTokenOracle.address)
        await curveLpTokenOracle.registerPool(CURVE_MUSD_LP)
        await masterOracle.updateTokenOracle(CURVE_MUSD_LP, curveLpTokenOracle.address)

        // SBTC (WBTC+renBTC+sBTC)
        const bTCPeggedTokenOracleFactory = new BTCPeggedTokenOracle__factory(deployer)
        const bTCPeggedTokenOracle = await bTCPeggedTokenOracleFactory.deploy(CHAINLINK_BTC_USD_AGGREGATOR, 60 * 60)
        await bTCPeggedTokenOracle.deployed()

        // MakerDAO uses BTC/USD Chainlink feed for renBTC
        // See: https://forum.makerdao.com/t/renbtc-mip6-collateral-application/2971
        await masterOracle.updateTokenOracle(RENBTC_ADDRESS, bTCPeggedTokenOracle.address)
        // Synthetix uses BTC/USD Chainlink feed for sBTC
        await masterOracle.updateTokenOracle(SBTC_ADDRESS, bTCPeggedTokenOracle.address)
        await curveLpTokenOracle.registerPool(CURVE_SBTC_LP)
        await masterOracle.updateTokenOracle(CURVE_SBTC_LP, curveLpTokenOracle.address)

        // wibBTC+SBTC
        const IbBtcTokenOracleFactory = new IbBtcTokenOracle__factory(deployer)
        const IbBtcTokenOracle = await IbBtcTokenOracleFactory.deploy(bTCPeggedTokenOracle.address)
        await IbBtcTokenOracle.deployed()

        await masterOracle.updateTokenOracle(WIBBTC_ADDRESS, IbBtcTokenOracle.address)
        await curveLpFactoryTokenOracle.registerPool(CURVE_IBBTC_SBTC_LP)
        await masterOracle.updateTokenOracle(CURVE_IBBTC_SBTC_LP, curveLpFactoryTokenOracle.address)

        // D3 (FRAX+FEI+alUSD)
        const aggregator = await smock.fake('PriceProvidersAggregator')
        const lastUpdatedAt = await timestampFromLatestBlock()
        aggregator['quoteTokenToUsd(uint8,address,uint256)'].returns(() => [parseEther('0.99'), lastUpdatedAt])

        const stableCoinProvider = await smock.fake('StableCoinProvider')
        stableCoinProvider.getStableCoinIfPegged.returns(DAI_ADDRESS)

        addressProvider.providersAggregator.returns(aggregator.address)
        addressProvider.stableCoinProvider.returns(stableCoinProvider.address)

        const alUsdMainnetOracleFactory = new AlusdTokenMainnetOracle__factory(deployer)
        const alUsdMainnetOracle = await alUsdMainnetOracleFactory.deploy(
          ethers.constants.MaxUint256 // stalePeriod
        )
        await alUsdMainnetOracle.deployed()

        await masterOracle.updateTokenOracle(ALUSD_ADDRESS, alUsdMainnetOracle.address)
        await curveLpFactoryTokenOracle.registerPool(CURVE_D3_LP)
        await masterOracle.updateTokenOracle(CURVE_D3_LP, curveLpFactoryTokenOracle.address)

        // Aave (aDAI+aUSDC+aUSDT)
        const aTokenOracleFactory = new ATokenOracle__factory(deployer)
        const aTokenOracle = await aTokenOracleFactory.deploy()
        await aTokenOracle.deployed()

        await curveLpTokenOracle.registerPool(CURVE_AAVE_LP)
        await masterOracle.updateTokenOracle(CURVE_AAVE_LP, curveLpTokenOracle.address)
        await masterOracle.updateTokenOracle(ADAI_ADDRESS, aTokenOracle.address)
        await masterOracle.updateTokenOracle(AUSDC_ADDRESS, aTokenOracle.address)
        await masterOracle.updateTokenOracle(AUSDT_ADDRESS, aTokenOracle.address)

        //
        // yEarn lending pools
        //
        const yEarnTokenOracleFactory = new YEarnTokenOracle__factory(deployer)
        const yEarnTokenOracle = await yEarnTokenOracleFactory.deploy()
        await yEarnTokenOracle.deployed()

        // compound (cDAI+cUSDC)
        await curveLpTokenOracle.registerPool(CURVE_COMPOUND_LP)
        await masterOracle.updateTokenOracle(CURVE_COMPOUND_LP, curveLpTokenOracle.address)

        // usdt (cDAI+cUSDC+USDT)
        await curveLpTokenOracle.registerPool(CURVE_USDT_LP)
        await masterOracle.updateTokenOracle(CURVE_USDT_LP, curveLpTokenOracle.address)

        // busd (yDAI+yUSDC+yUSDT+yBUSD)
        const busdPool = new ethers.Contract(
          CURVE_BUSD_POOL,
          ['function coins(int128) view returns(address)'],
          deployer
        )
        await curveLpTokenOracle.registerPool(CURVE_BUSD_LP)
        await masterOracle.updateTokenOracle(CURVE_BUSD_LP, curveLpTokenOracle.address)
        await masterOracle.updateTokenOracle(await busdPool.coins(0), yEarnTokenOracle.address)
        await masterOracle.updateTokenOracle(await busdPool.coins(1), yEarnTokenOracle.address)
        await masterOracle.updateTokenOracle(await busdPool.coins(2), yEarnTokenOracle.address)
        await masterOracle.updateTokenOracle(await busdPool.coins(3), yEarnTokenOracle.address)

        // pax (ycDAI+ycUSDC+ycUSDT+USDP)
        const paxPool = new ethers.Contract(CURVE_PAX_POOL, ['function coins(int128) view returns(address)'], deployer)
        await curveLpTokenOracle.registerPool(CURVE_PAX_LP)
        await masterOracle.updateTokenOracle(CURVE_PAX_LP, curveLpTokenOracle.address)
        await masterOracle.updateTokenOracle(await paxPool.coins(0), yEarnTokenOracle.address)
        await masterOracle.updateTokenOracle(await paxPool.coins(1), yEarnTokenOracle.address)
        await masterOracle.updateTokenOracle(await paxPool.coins(2), yEarnTokenOracle.address)

        // y (yDAI+yUSDC+yYSDT+yTUSD)
        const yPool = new ethers.Contract(CURVE_Y_POOL, ['function coins(int128) view returns(address)'], deployer)
        await curveLpTokenOracle.registerPool(CURVE_Y_LP)
        await masterOracle.updateTokenOracle(CURVE_Y_LP, curveLpTokenOracle.address)
        await masterOracle.updateTokenOracle(await yPool.coins(0), yEarnTokenOracle.address)
        await masterOracle.updateTokenOracle(await yPool.coins(1), yEarnTokenOracle.address)
        await masterOracle.updateTokenOracle(await yPool.coins(2), yEarnTokenOracle.address)
        await masterOracle.updateTokenOracle(await yPool.coins(3), yEarnTokenOracle.address)
      })

      it('should get price for 3CRV', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(TRICRV_ADDRESS)

        // then
        expect(price).closeTo(toUSD('1.02'), toUSD('0.001'))
      })

      it('should get price for SBTC', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(CURVE_SBTC_LP)

        // then
        expect(price).closeTo(toUSD('44,137.36'), toUSD('0.01'))
      })

      it('should get price for MIMx3CRV', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(CURVE_MIM_3CRV_LP)

        // then
        expect(price).closeTo(toUSD('1.004'), toUSD('0.001'))
      })

      it('should get price for SUSD', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(CURVE_SUSD_LP)

        // then
        expect(price).closeTo(toUSD('1.046'), toUSD('0.001'))
      })

      it('should get price for D3POOL', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(CURVE_D3_LP)

        // then
        expect(price).closeTo(toUSD('0.991'), toUSD('0.001'))
      })

      it('should get price for FRAXx3Crv', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(CURVE_FRAX_3CRV_LP)

        // then
        expect(price).closeTo(toUSD('1.006'), toUSD('0.001'))
      })

      it('should get price for ibBTC', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(CURVE_IBBTC_SBTC_LP)

        // then
        expect(price).closeTo(toUSD('43,803.65'), toUSD('0.01'))
      })

      it('should get price for mUSD Pool', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(CURVE_MUSD_LP)

        // then
        expect(price).closeTo(toUSD('1.015'), toUSD('0.001'))
      })

      it('should get price for aAve Pool', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(CURVE_AAVE_LP)

        // then
        expect(price).closeTo(toUSD('1.087'), toUSD('0.001'))
      })

      it('should get price for compound Pool', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(CURVE_COMPOUND_LP)

        // then
        expect(price).closeTo(toUSD('0.024'), toUSD('0.01'))
      })

      it('should get price for usdt Pool', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(CURVE_USDT_LP)

        // then
        expect(price).closeTo(toUSD('0.024'), toUSD('0.01'))
      })

      it('should get price for busd Pool', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(CURVE_BUSD_LP)

        // then
        expect(price).closeTo(toUSD('1.21'), toUSD('0.01'))
      })

      it('should get price for pax Pool', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(CURVE_PAX_LP)

        // then
        expect(price).closeTo(toUSD('1.04'), toUSD('0.01'))
      })

      it('should get price for y Pool', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(CURVE_Y_LP)

        // then
        expect(price).closeTo(toUSD('1.24'), toUSD('0.01'))
      })
    })

    describe('CTokens', function () {
      it('getPriceInUsd (18 decimals underlying)', async function () {
        const price = await masterOracle.getPriceInUsd(CDAI_ADDRESS)
        expect(price).closeTo(toUSD('0.021'), toUSD('0.001')) // 1 cDAI ~= $0.021
      })

      it('getPriceInUsd (6 decimals underlying)', async function () {
        const price = await masterOracle.getPriceInUsd(CUSDC_ADDRESS)
        expect(price).closeTo(toUSD('0.022'), toUSD('0.001')) // 1 cUSDC ~= $0.022
      })

      it('getPriceInUsd (ETH - 0x00..00 underlying)', async function () {
        const price = await masterOracle.getPriceInUsd(CETH_ADDRESS)
        expect(price).closeTo(toUSD('64.92'), toUSD('0.1')) // 1 cETH ~= $64.92
      })
    })
  })

  describe('MasterOracle @avalanche', function () {
    let chainlinkPriceProvider: ChainlinkAvalanchePriceProvider
    let chainlinkOracle: ChainlinkOracle

    const {
      DAI_ADDRESS,
      CHAINLINK_BTC_USD_AGGREGATOR,
      CURVE_REN_LP,
      avDAI_ADDRESS,
      avUSDC_ADDRESS,
      avUSDT_ADDRESS,
      CURVE_AAVE_LP,
      RENBTCe_ADDRESS,
      avWBTC_ADDRESS,
      WETH_ADDRESS,
    } = Address.avalanche

    beforeEach(async function () {
      const chainlinkPriceProviderFactory = new ChainlinkAvalanchePriceProvider__factory(deployer)
      chainlinkPriceProvider = await chainlinkPriceProviderFactory.deploy()
      await chainlinkPriceProvider.deployed()

      const aggregatorProviderFactory = new PriceProvidersAggregator__factory(deployer)
      const aggregator = await aggregatorProviderFactory.deploy(WETH_ADDRESS)
      await aggregator.deployed()
      await aggregator.setPriceProvider(Provider.CHAINLINK, chainlinkPriceProvider.address)
      addressProvider.providersAggregator.returns(aggregator.address)

      const chainlinkOracleFactory = new ChainlinkOracle__factory(deployer)
      chainlinkOracle = await chainlinkOracleFactory.deploy(STALE_PERIOD)
      await chainlinkOracle.deployed()

      const masterOracleFactory = new MasterOracle__factory(deployer)
      masterOracle = await masterOracleFactory.deploy(chainlinkOracle.address)
      await masterOracle.deployed()
    })

    describe('getPriceInUsd', function () {
      it('should revert if token oracle returns 0', async function () {
        // given
        const daiFakeOracle = await smock.fake('ITokenOracle')
        daiFakeOracle.getPriceInUsd.returns(0)
        await masterOracle.updateTokenOracle(DAI_ADDRESS, daiFakeOracle.address)

        // when-then
        expect(masterOracle.getPriceInUsd(DAI_ADDRESS)).to.revertedWith('invalid-token-price')
      })
    })

    describe('Curve LP Tokens', function () {
      beforeEach(async function () {
        const curveLpTokenOracleFactory = new CurveLpTokenOracle__factory(deployer)
        const curveLpTokenOracle = await curveLpTokenOracleFactory.deploy()
        await curveLpTokenOracle.deployed()

        const aTokenOracleFactory = new ATokenOracle__factory(deployer)
        const aTokenOracle = await aTokenOracleFactory.deploy()
        await aTokenOracle.deployed()

        // ren (avWBTC + renBTC.e)
        const bTCPeggedTokenOracleFactory = new BTCPeggedTokenOracle__factory(deployer)
        const bTCPeggedTokenOracle = await bTCPeggedTokenOracleFactory.deploy(CHAINLINK_BTC_USD_AGGREGATOR, 60 * 60)
        await bTCPeggedTokenOracle.deployed()

        await curveLpTokenOracle.registerPool(CURVE_REN_LP)
        await masterOracle.updateTokenOracle(CURVE_REN_LP, curveLpTokenOracle.address)
        await masterOracle.updateTokenOracle(RENBTCe_ADDRESS, bTCPeggedTokenOracle.address)
        await masterOracle.updateTokenOracle(avWBTC_ADDRESS, aTokenOracle.address)

        // Aave (aDAI.e + aUSDC.e + aUSDT.e)
        await curveLpTokenOracle.registerPool(CURVE_AAVE_LP)
        await masterOracle.updateTokenOracle(CURVE_AAVE_LP, curveLpTokenOracle.address)
        await masterOracle.updateTokenOracle(avDAI_ADDRESS, aTokenOracle.address)
        await masterOracle.updateTokenOracle(avUSDC_ADDRESS, aTokenOracle.address)
        await masterOracle.updateTokenOracle(avUSDT_ADDRESS, aTokenOracle.address)
      })

      it('should get price for ren', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(CURVE_REN_LP)

        // then
        expect(price).closeTo(toUSD('43,047.01'), toUSD('0.01'))
      })

      it('should get price for aAve Pool', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(CURVE_AAVE_LP)

        // then
        expect(price).closeTo(toUSD('1.016'), toUSD('0.001'))
      })
    })

    describe('Synth Tokens', function () {
      const {
        CHAINLINK_USDC_USD_AGGREGATOR,
        CHAINLINK_AVAX_USD_AGGREGATOR,
        CHAINLINK_ETH_USD_AGGREGATOR,
        CHAINLINK_DAI_USD_AGGREGATOR,
        CHAINLINK_USDT_USD_AGGREGATOR,
        CHAINLINK_UNI_USD_AGGREGATOR,
        CHAINLINK_CRV_USD_AGGREGATOR,
        CHAINLINK_AAVE_USD_AGGREGATOR,
        MSD_USDC,
        MSD_WAVAX,
        MSD_WETH,
        MSD_DAI,
        MSD_USDT,
        MS_BTC,
        MS_USD,
        MS_UNI,
        MS_CRV,
        MS_AAVE,
      } = Address.avalanche

      beforeEach(async function () {
        const msUsdTokenOracleFactory = new SynthUsdTokenOracle__factory(deployer)
        const msUsdTokenOracle = await msUsdTokenOracleFactory.deploy()
        await msUsdTokenOracle.deployed()

        await chainlinkPriceProvider.updateAggregator(MSD_USDC, CHAINLINK_USDC_USD_AGGREGATOR)
        await chainlinkPriceProvider.updateAggregator(MSD_WAVAX, CHAINLINK_AVAX_USD_AGGREGATOR)
        await chainlinkPriceProvider.updateAggregator(MSD_WETH, CHAINLINK_ETH_USD_AGGREGATOR)
        await chainlinkPriceProvider.updateAggregator(MSD_DAI, CHAINLINK_DAI_USD_AGGREGATOR)
        await chainlinkPriceProvider.updateAggregator(MSD_USDT, CHAINLINK_USDT_USD_AGGREGATOR)
        await chainlinkPriceProvider.updateAggregator(MS_BTC, CHAINLINK_BTC_USD_AGGREGATOR)
        await chainlinkPriceProvider.updateAggregator(MS_UNI, CHAINLINK_UNI_USD_AGGREGATOR)
        await chainlinkPriceProvider.updateAggregator(MS_CRV, CHAINLINK_CRV_USD_AGGREGATOR)
        await chainlinkPriceProvider.updateAggregator(MS_AAVE, CHAINLINK_AAVE_USD_AGGREGATOR)

        await masterOracle.updateTokenOracle(MS_USD, msUsdTokenOracle.address)
      })

      it('should get price for msdUSDC', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(MSD_USDC)

        // then
        expect(price).closeTo(toUSD('1'), toUSD('0.01'))
      })

      it('should get price for msdWAVAX', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(MSD_WAVAX)

        // then
        expect(price).closeTo(toUSD('86.37'), toUSD('0.01'))
      })

      it('should get price for msdWETH', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(MSD_WETH)

        // then
        expect(price).closeTo(toUSD('3,251.60'), toUSD('0.01'))
      })

      it('should get price for msdDAI', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(MSD_DAI)

        // then
        expect(price).closeTo(toUSD('1'), toUSD('0.001'))
      })

      it('should get price for msdUSDT', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(MSD_USDT)

        // then
        expect(price).closeTo(toUSD('1'), toUSD('0.001'))
      })

      it('should get price for msBTC', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(MS_BTC)

        // then
        expect(price).closeTo(toUSD('42,794.64'), toUSD('0.01'))
      })

      it('should get price for msUSD', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(MS_USD)

        // then
        expect(price).eq(toUSD('1'))
      })

      it('should get price for msUNI', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(MS_UNI)

        // then
        expect(price).closeTo(toUSD('9.89'), toUSD('0.01'))
      })

      it('should get price for msCRV', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(MS_CRV)

        // then
        expect(price).closeTo(toUSD('2.41'), toUSD('0.01'))
      })

      it('should get price for msAAVE', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(MS_AAVE)

        // then
        expect(price).closeTo(toUSD('190.75'), toUSD('0.01'))
      })
    })
  })

  describe('MasterOracle @arbitrum', function () {
    let chainlinkOracle: ChainlinkOracleMock

    const {DAI_ADDRESS, CURVE_2POOL_LP} = Address.arbitrum

    beforeEach(async function () {
      const chainlinkPriceProviderFactory = new ChainlinkArbitrumPriceProvider__factory(deployer)
      const chainlinkPriceProvider = await chainlinkPriceProviderFactory.deploy()
      await chainlinkPriceProvider.deployed()

      const chainlinkOracleMockFactory = new ChainlinkOracleMock__factory(deployer)
      chainlinkOracle = await chainlinkOracleMockFactory.deploy(chainlinkPriceProvider.address)
      await chainlinkOracle.deployed()

      const masterOracleFactory = new MasterOracle__factory(deployer)
      masterOracle = await masterOracleFactory.deploy(chainlinkOracle.address)
      await masterOracle.deployed()
    })

    describe('getPriceInUsd', function () {
      it('should revert if token oracle returns 0', async function () {
        // given
        const daiFakeOracle = await smock.fake('ITokenOracle')
        daiFakeOracle.getPriceInUsd.returns(0)
        await masterOracle.updateTokenOracle(DAI_ADDRESS, daiFakeOracle.address)

        // when-then
        expect(masterOracle.getPriceInUsd(DAI_ADDRESS)).to.revertedWith('invalid-token-price')
      })
    })

    describe('Curve LP Tokens', function () {
      let curveLpTokenOracle: CurveLpTokenOracle

      beforeEach(async function () {
        const curveLpTokenOracleFactory = new CurveLpTokenOracle__factory(deployer)
        curveLpTokenOracle = await curveLpTokenOracleFactory.deploy()
        await curveLpTokenOracle.deployed()

        // 2pool (USDC + USDT)
        await curveLpTokenOracle.registerPool(CURVE_2POOL_LP)
        await masterOracle.updateTokenOracle(CURVE_2POOL_LP, curveLpTokenOracle.address)
      })

      it('should get price for 2pool', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(CURVE_2POOL_LP)

        // then
        expect(price).closeTo(toUSD('1.004'), toUSD('0.001'))
      })
    })
  })
})
