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
import Quote from '../helpers/quotes'

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
      DAI,
      RENBTC,
      SBTC,
      ALUSD,
      WIBBTC,
      MUSD,
      Aave: {ADAI, AUSDC, AUSDT},
      Compound: {CDAI, CUSDC, CETH},
      WETH,
      BUSD,
      USDP,
      Chainlink: {CHAINLINK_BTC_USD_AGGREGATOR, CHAINLINK_BUSD_USD_AGGREGATOR, CHAINLINK_USDP_USD_AGGREGATOR},
      Curve: {
        TRIPOOL_LP,
        SBTC_LP,
        MIM_3CRV_LP,
        SUSD_LP,
        D3_LP,
        FRAX_3CRV_LP,
        IBBTC_SBTC_LP,
        MUSD_LP,
        AAVE_LP,
        BUSD_LP,
        BUSD_POOL,
        PAX_LP,
        PAX_POOL,
        Y_LP,
        Y_POOL,
        COMPOUND_LP,
        USDT_LP,
      },
    } = Address.mainnet

    beforeEach(async function () {
      const chainlinkPriceProviderFactory = new ChainlinkMainnetPriceProvider__factory(deployer)
      const chainlinkPriceProvider = await chainlinkPriceProviderFactory.deploy()
      await chainlinkPriceProvider.deployed()
      await chainlinkPriceProvider.updateAggregator(BUSD, CHAINLINK_BUSD_USD_AGGREGATOR)
      await chainlinkPriceProvider.updateAggregator(USDP, CHAINLINK_USDP_USD_AGGREGATOR)

      const chainlinkOracleMockFactory = new ChainlinkOracleMock__factory(deployer)
      chainlinkOracle = await chainlinkOracleMockFactory.deploy(chainlinkPriceProvider.address)
      await chainlinkOracle.deployed()

      const masterOracleFactory = new MasterOracle__factory(deployer)
      masterOracle = await masterOracleFactory.deploy(chainlinkOracle.address)
      await masterOracle.deployed()

      const cTokenOracleFactory = new CTokenOracle__factory(deployer)
      const cTokenOracle = await cTokenOracleFactory.deploy(WETH)
      await cTokenOracle.deployed()

      await masterOracle.updateTokenOracle(CDAI, cTokenOracle.address)
      await masterOracle.updateTokenOracle(CUSDC, cTokenOracle.address)
      await masterOracle.updateTokenOracle(CETH, cTokenOracle.address)
    })

    describe('getPriceInUsd', function () {
      it('should revert if token oracle returns 0', async function () {
        // given
        const daiFakeOracle = await smock.fake('ITokenOracle')
        daiFakeOracle.getPriceInUsd.returns(0)
        await masterOracle.updateTokenOracle(DAI, daiFakeOracle.address)

        // when-then
        expect(masterOracle.getPriceInUsd(DAI)).to.revertedWith('invalid-token-price')
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
        await curveLpTokenOracle.registerLp(TRIPOOL_LP)
        await masterOracle.updateTokenOracle(TRIPOOL_LP, curveLpTokenOracle.address)

        // MIM+3Crv
        await curveLpTokenOracle.registerLp(MIM_3CRV_LP)
        await masterOracle.updateTokenOracle(MIM_3CRV_LP, curveLpTokenOracle.address)

        // FRAX+3Crv
        await curveLpTokenOracle.registerLp(FRAX_3CRV_LP)
        await masterOracle.updateTokenOracle(FRAX_3CRV_LP, curveLpTokenOracle.address)

        // sUSD+DAI+USDC+USDT
        await curveLpTokenOracle.registerLp(SUSD_LP)
        await masterOracle.updateTokenOracle(SUSD_LP, curveLpTokenOracle.address)

        // mUSD+DAI+USDC+USDT
        const mStableTokenOracleFactory = new MStableTokenOracle__factory(deployer)
        const mStableTokenOracle = await mStableTokenOracleFactory.deploy()
        await mStableTokenOracle.deployed()

        await masterOracle.updateTokenOracle(MUSD, mStableTokenOracle.address)
        await curveLpTokenOracle.registerLp(MUSD_LP)
        await masterOracle.updateTokenOracle(MUSD_LP, curveLpTokenOracle.address)

        // SBTC (WBTC+renBTC+sBTC)
        const bTCPeggedTokenOracleFactory = new BTCPeggedTokenOracle__factory(deployer)
        const bTCPeggedTokenOracle = await bTCPeggedTokenOracleFactory.deploy(CHAINLINK_BTC_USD_AGGREGATOR, 60 * 60)
        await bTCPeggedTokenOracle.deployed()

        // MakerDAO uses BTC/USD Chainlink feed for renBTC
        // See: https://forum.makerdao.com/t/renbtc-mip6-collateral-application/2971
        await masterOracle.updateTokenOracle(RENBTC, bTCPeggedTokenOracle.address)
        // Synthetix uses BTC/USD Chainlink feed for sBTC
        await masterOracle.updateTokenOracle(SBTC, bTCPeggedTokenOracle.address)
        await curveLpTokenOracle.registerLp(SBTC_LP)
        await masterOracle.updateTokenOracle(SBTC_LP, curveLpTokenOracle.address)

        // wibBTC+SBTC
        const IbBtcTokenOracleFactory = new IbBtcTokenOracle__factory(deployer)
        const IbBtcTokenOracle = await IbBtcTokenOracleFactory.deploy(bTCPeggedTokenOracle.address)
        await IbBtcTokenOracle.deployed()

        await masterOracle.updateTokenOracle(WIBBTC, IbBtcTokenOracle.address)
        await curveLpFactoryTokenOracle.registerLp(IBBTC_SBTC_LP)
        await masterOracle.updateTokenOracle(IBBTC_SBTC_LP, curveLpFactoryTokenOracle.address)

        // D3 (FRAX+FEI+alUSD)
        const aggregator = await smock.fake('PriceProvidersAggregator')
        const lastUpdatedAt = await timestampFromLatestBlock()
        aggregator['quoteTokenToUsd(uint8,address,uint256)'].returns(() => [parseEther('0.99'), lastUpdatedAt])

        const stableCoinProvider = await smock.fake('StableCoinProvider')
        stableCoinProvider.getStableCoinIfPegged.returns(DAI)

        addressProvider.providersAggregator.returns(aggregator.address)
        addressProvider.stableCoinProvider.returns(stableCoinProvider.address)

        const alUsdMainnetOracleFactory = new AlusdTokenMainnetOracle__factory(deployer)
        const alUsdMainnetOracle = await alUsdMainnetOracleFactory.deploy(
          ethers.constants.MaxUint256 // stalePeriod
        )
        await alUsdMainnetOracle.deployed()

        await masterOracle.updateTokenOracle(ALUSD, alUsdMainnetOracle.address)
        await curveLpFactoryTokenOracle.registerLp(D3_LP)
        await masterOracle.updateTokenOracle(D3_LP, curveLpFactoryTokenOracle.address)

        // Aave (aDAI+aUSDC+aUSDT)
        const aTokenOracleFactory = new ATokenOracle__factory(deployer)
        const aTokenOracle = await aTokenOracleFactory.deploy()
        await aTokenOracle.deployed()

        await curveLpTokenOracle.registerLp(AAVE_LP)
        await masterOracle.updateTokenOracle(AAVE_LP, curveLpTokenOracle.address)
        await masterOracle.updateTokenOracle(ADAI, aTokenOracle.address)
        await masterOracle.updateTokenOracle(AUSDC, aTokenOracle.address)
        await masterOracle.updateTokenOracle(AUSDT, aTokenOracle.address)

        //
        // yEarn lending pools
        //
        const yEarnTokenOracleFactory = new YEarnTokenOracle__factory(deployer)
        const yEarnTokenOracle = await yEarnTokenOracleFactory.deploy()
        await yEarnTokenOracle.deployed()

        // compound (cDAI+cUSDC)
        await curveLpTokenOracle.registerLendingLp(COMPOUND_LP)
        await masterOracle.updateTokenOracle(COMPOUND_LP, curveLpTokenOracle.address)

        // usdt (cDAI+cUSDC+USDT)
        await curveLpTokenOracle.registerLendingLp(USDT_LP)
        await masterOracle.updateTokenOracle(USDT_LP, curveLpTokenOracle.address)

        // busd (yDAI+yUSDC+yUSDT+yBUSD)
        const busdPool = new ethers.Contract(BUSD_POOL, ['function coins(int128) view returns(address)'], deployer)
        await curveLpTokenOracle.registerLendingLp(BUSD_LP)
        await masterOracle.updateTokenOracle(BUSD_LP, curveLpTokenOracle.address)
        await masterOracle.updateTokenOracle(await busdPool.coins(0), yEarnTokenOracle.address)
        await masterOracle.updateTokenOracle(await busdPool.coins(1), yEarnTokenOracle.address)
        await masterOracle.updateTokenOracle(await busdPool.coins(2), yEarnTokenOracle.address)
        await masterOracle.updateTokenOracle(await busdPool.coins(3), yEarnTokenOracle.address)

        // pax (ycDAI+ycUSDC+ycUSDT+USDP)
        const paxPool = new ethers.Contract(PAX_POOL, ['function coins(int128) view returns(address)'], deployer)
        await curveLpTokenOracle.registerLendingLp(PAX_LP)
        await masterOracle.updateTokenOracle(PAX_LP, curveLpTokenOracle.address)
        await masterOracle.updateTokenOracle(await paxPool.coins(0), yEarnTokenOracle.address)
        await masterOracle.updateTokenOracle(await paxPool.coins(1), yEarnTokenOracle.address)
        await masterOracle.updateTokenOracle(await paxPool.coins(2), yEarnTokenOracle.address)

        // y (yDAI+yUSDC+yYSDT+yTUSD)
        const yPool = new ethers.Contract(Y_POOL, ['function coins(int128) view returns(address)'], deployer)
        await curveLpTokenOracle.registerLendingLp(Y_LP)
        await masterOracle.updateTokenOracle(Y_LP, curveLpTokenOracle.address)
        await masterOracle.updateTokenOracle(await yPool.coins(0), yEarnTokenOracle.address)
        await masterOracle.updateTokenOracle(await yPool.coins(1), yEarnTokenOracle.address)
        await masterOracle.updateTokenOracle(await yPool.coins(2), yEarnTokenOracle.address)
        await masterOracle.updateTokenOracle(await yPool.coins(3), yEarnTokenOracle.address)
      })

      it('should get price for 3CRV', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(TRIPOOL_LP)

        // then
        expect(price).closeTo(Quote.mainnet.CURVE_TRIPOOL_LP_USD, toUSD('0.01'))
      })

      it('should get price for SBTC', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(SBTC_LP)

        // then
        expect(price).closeTo(Quote.mainnet.CURVE_SBTC_LP_USD, toUSD('1'))
      })

      it('should get price for MIMx3CRV', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(MIM_3CRV_LP)

        // then
        expect(price).closeTo(Quote.mainnet.CURVE_MIM_3CRV_LP_USD, toUSD('0.001'))
      })

      it('should get price for SUSD', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(SUSD_LP)

        // then
        expect(price).closeTo(Quote.mainnet.CURVE_SUSD_LP_USD, toUSD('0.01'))
      })

      it('should get price for D3POOL', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(D3_LP)

        // then
        expect(price).closeTo(Quote.mainnet.CURVE_D3POOL_LP_USD, toUSD('0.01'))
      })

      it('should get price for FRAXx3Crv', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(FRAX_3CRV_LP)

        // then
        expect(price).closeTo(Quote.mainnet.CURVE_FRAX_3CRV_LP_USD, toUSD('0.01'))
      })

      it('should get price for ibBTC', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(IBBTC_SBTC_LP)

        // then
        expect(price).closeTo(Quote.mainnet.CURVE_IBBTC_LP_USD, toUSD('0.01'))
      })

      it('should get price for mUSD Pool', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(MUSD_LP)

        // then
        expect(price).closeTo(Quote.mainnet.CURVE_MUSD_LP_USD, toUSD('0.001'))
      })

      it('should get price for aAve Pool', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(AAVE_LP)

        // then
        expect(price).closeTo(Quote.mainnet.CURVE_AAVE_LP_USD, toUSD('0.001'))
      })

      it('should get price for compound Pool', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(COMPOUND_LP)

        // then
        expect(price).closeTo(Quote.mainnet.CURVE_COMPOUND_LP_USD, toUSD('0.01'))
      })

      it('should get price for usdt Pool', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(USDT_LP)

        // then
        expect(price).closeTo(Quote.mainnet.CURVE_USDT_LP_USD, toUSD('0.01'))
      })

      it('should get price for busd Pool', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(BUSD_LP)

        // then
        expect(price).closeTo(Quote.mainnet.CURVE_BUSD_LP_USD, toUSD('0.01'))
      })

      it('should get price for pax Pool', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(PAX_LP)

        // then
        expect(price).closeTo(Quote.mainnet.CURVE_PAX_LP_USD, toUSD('0.01'))
      })

      it('should get price for y Pool', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(Y_LP)

        // then
        expect(price).closeTo(Quote.mainnet.CURVE_Y_LP_USD, toUSD('0.01'))
      })
    })

    describe('CTokens', function () {
      it('getPriceInUsd (18 decimals underlying)', async function () {
        const price = await masterOracle.getPriceInUsd(CDAI)
        expect(price).closeTo(Quote.mainnet.CDAI_USD, toUSD('0.001'))
      })

      it('getPriceInUsd (6 decimals underlying)', async function () {
        const price = await masterOracle.getPriceInUsd(CUSDC)
        expect(price).closeTo(toUSD('0.022'), toUSD('0.01'))
      })

      it('getPriceInUsd (ETH - 0x00..00 underlying)', async function () {
        const price = await masterOracle.getPriceInUsd(CETH)
        expect(price).closeTo(Quote.mainnet.CETH_USD, toUSD('1'))
      })
    })
  })

  describe('MasterOracle @avalanche', function () {
    let chainlinkPriceProvider: ChainlinkAvalanchePriceProvider
    let chainlinkOracle: ChainlinkOracle

    const {
      DAI,
      RENBTCe,
      WETH,
      Chainlink: {CHAINLINK_BTC_USD_AGGREGATOR},
      Curve: {REN_LP, AAVE_LP},
      Aave: {avDAI, avUSDC, avUSDT, avWBTC},
    } = Address.avalanche

    beforeEach(async function () {
      const chainlinkPriceProviderFactory = new ChainlinkAvalanchePriceProvider__factory(deployer)
      chainlinkPriceProvider = await chainlinkPriceProviderFactory.deploy()
      await chainlinkPriceProvider.deployed()

      const aggregatorProviderFactory = new PriceProvidersAggregator__factory(deployer)
      const aggregator = await aggregatorProviderFactory.deploy(WETH)
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
        await masterOracle.updateTokenOracle(DAI, daiFakeOracle.address)

        // when-then
        expect(masterOracle.getPriceInUsd(DAI)).to.revertedWith('invalid-token-price')
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

        await curveLpTokenOracle.registerLp(REN_LP)
        await masterOracle.updateTokenOracle(REN_LP, curveLpTokenOracle.address)
        await masterOracle.updateTokenOracle(RENBTCe, bTCPeggedTokenOracle.address)
        await masterOracle.updateTokenOracle(avWBTC, aTokenOracle.address)

        // Aave (aDAI.e + aUSDC.e + aUSDT.e)
        await curveLpTokenOracle.registerLp(AAVE_LP)
        await masterOracle.updateTokenOracle(AAVE_LP, curveLpTokenOracle.address)
        await masterOracle.updateTokenOracle(avDAI, aTokenOracle.address)
        await masterOracle.updateTokenOracle(avUSDC, aTokenOracle.address)
        await masterOracle.updateTokenOracle(avUSDT, aTokenOracle.address)
      })

      it('should get price for ren', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(REN_LP)

        // then
        expect(price).closeTo(Quote.avalanche.CURVE_REN_LP_USD, toUSD('1'))
      })

      it('should get price for aAve Pool', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(AAVE_LP)

        // then
        expect(price).closeTo(Quote.avalanche.CURVE_AAVE_LP_USD, toUSD('0.1'))
      })
    })

    describe('Synth Tokens', function () {
      const {
        Chainlink: {
          CHAINLINK_USDC_USD_AGGREGATOR,
          CHAINLINK_AVAX_USD_AGGREGATOR,
          CHAINLINK_ETH_USD_AGGREGATOR,
          CHAINLINK_DAI_USD_AGGREGATOR,
          CHAINLINK_USDT_USD_AGGREGATOR,
          CHAINLINK_UNI_USD_AGGREGATOR,
          CHAINLINK_CRV_USD_AGGREGATOR,
          CHAINLINK_AAVE_USD_AGGREGATOR,
        },
        Synth: {MSD_USDC, MSD_WAVAX, MSD_WETH, MSD_DAI, MSD_USDT, MS_BTC, MS_USD, MS_UNI, MS_CRV, MS_AAVE},
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
        expect(price).closeTo(Quote.avalanche.AVAX_USD, toUSD('1'))
      })

      it('should get price for msdWETH', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(MSD_WETH)

        // then
        expect(price).closeTo(Quote.avalanche.ETH_USD, toUSD('1'))
      })

      it('should get price for msdDAI', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(MSD_DAI)

        // then
        expect(price).closeTo(parseEther('1'), toUSD('0.1'))
      })

      it('should get price for msdUSDT', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(MSD_USDT)

        // then
        expect(price).closeTo(parseEther('1'), toUSD('0.1'))
      })

      it('should get price for msBTC', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(MS_BTC)

        // then
        expect(price).closeTo(Quote.avalanche.BTC_USD, toUSD('50'))
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
        expect(price).closeTo(Quote.avalanche.UNI_USD, toUSD('0.01'))
      })

      it('should get price for msCRV', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(MS_CRV)

        // then
        expect(price).closeTo(Quote.avalanche.CRV_USD, toUSD('0.01'))
      })

      it('should get price for msAAVE', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(MS_AAVE)

        // then
        expect(price).closeTo(Quote.avalanche.AAVE_USD, toUSD('1'))
      })
    })
  })

  describe('MasterOracle @arbitrum', function () {
    let chainlinkOracle: ChainlinkOracleMock

    const {
      DAI: DAI,
      Curve: {TWOPOOL_LP},
    } = Address.arbitrum

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
        await masterOracle.updateTokenOracle(DAI, daiFakeOracle.address)

        // when-then
        expect(masterOracle.getPriceInUsd(DAI)).to.revertedWith('invalid-token-price')
      })
    })

    describe('Curve LP Tokens', function () {
      let curveLpTokenOracle: CurveLpTokenOracle

      beforeEach(async function () {
        const curveLpTokenOracleFactory = new CurveLpTokenOracle__factory(deployer)
        curveLpTokenOracle = await curveLpTokenOracleFactory.deploy()
        await curveLpTokenOracle.deployed()

        // 2pool (USDC + USDT)
        await curveLpTokenOracle.registerLp(TWOPOOL_LP)
        await masterOracle.updateTokenOracle(TWOPOOL_LP, curveLpTokenOracle.address)
      })

      it('should get price for 2pool', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(TWOPOOL_LP)

        // then
        expect(price).closeTo(toUSD('1.004'), toUSD('0.001'))
      })
    })
  })
})
