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
  ChainlinkMainnetPriceProvider,
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
} from '../../typechain-types'
import Address from '../../helpers/address'
import {parseEther, timestampFromLatestBlock, toUSD} from '../helpers'
import {smock} from '@defi-wonderland/smock'

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
} = Address.mainnet

describe('MasterOracle @mainnet', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let chainlinkPriceProvider: ChainlinkMainnetPriceProvider
  let masterOracle: MasterOracle
  let chainlinkOracleMock: ChainlinkOracleMock

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer] = await ethers.getSigners()

    const chainlinkPriceProviderFactory = new ChainlinkMainnetPriceProvider__factory(deployer)
    chainlinkPriceProvider = await chainlinkPriceProviderFactory.deploy()
    await chainlinkPriceProvider.deployed()

    const chainlinkOracleMockFactory = new ChainlinkOracleMock__factory(deployer)
    chainlinkOracleMock = await chainlinkOracleMockFactory.deploy(chainlinkPriceProvider.address)
    await chainlinkOracleMock.deployed()

    const masterOracleFactory = new MasterOracle__factory(deployer)
    masterOracle = await masterOracleFactory.deploy(chainlinkOracleMock.address)
    await masterOracle.deployed()
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
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

      const alUsdMainnetOracleFactory = new AlusdTokenMainnetOracle__factory(deployer)
      const alUsdMainnetOracle = await alUsdMainnetOracleFactory.deploy(
        aggregator.address,
        stableCoinProvider.address,
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
  })

  describe('CTokens', function () {
    beforeEach(async function () {
      snapshotId = await ethers.provider.send('evm_snapshot', [])
      ;[deployer] = await ethers.getSigners()

      const cTokenOracleFactory = new CTokenOracle__factory(deployer)
      const cTokenOracle = await cTokenOracleFactory.deploy(WETH_ADDRESS)
      await cTokenOracle.deployed()

      await masterOracle.updateTokenOracle(CDAI_ADDRESS, cTokenOracle.address)
      await masterOracle.updateTokenOracle(CUSDC_ADDRESS, cTokenOracle.address)
      await masterOracle.updateTokenOracle(CETH_ADDRESS, cTokenOracle.address)
    })

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
