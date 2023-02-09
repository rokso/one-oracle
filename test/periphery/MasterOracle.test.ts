/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import hre, {ethers, deployments} from 'hardhat'
import {
  MasterOracle,
  MasterOracle__factory,
  BTCPeggedTokenOracle__factory,
  ChainlinkOracle__factory,
  AlusdTokenMainnetOracle__factory,
  StableCoinProvider__factory,
  AggregatorV3Interface__factory,
  IERC20__factory,
  ISFrxEth__factory,
  ICurvePool__factory,
  AddressProviderMock__factory,
} from '../../typechain-types'
import Address from '../../helpers/address'
import {impersonateAccount, increaseTime, parseEther, resetFork, toUSD} from '../helpers'
import {adjustBalance} from '../helpers/balance'
import {smock} from '@defi-wonderland/smock'
import Quote from '../helpers/quotes'

describe('MasterOracle', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let masterOracle: MasterOracle

  before(async function () {
    // Reset fork to clean up fake `AddressProvider` contract from other test suites
    await resetFork()

    deployer = await impersonateAccount(Address.DEPLOYER)
  })

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('MasterOracle @mainnet', function () {
    const {
      DAI,
      USDC,
      USDT,
      Compound: {CDAI, CUSDC, CETH},
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
        PAX_LP,
        Y_LP,
        COMPOUND_LP,
        USDT_LP,
        DOLA_3CRV_LP,
        GUSD_LP,
        REN_LP,
        FRAX_USDC_LP,
        DOLA_FRAXBP_LP,
      },
      Vesper: {vaUSDC, vaDAI, vaFRAX, vaETH, vastETH, vaWBTC, vaLINK},
      Synth: {msETH, msUSD, msBTC, msDOGE},
      Frax: {sFrxETH, frxETH},
    } = Address.mainnet

    before(async function () {
      // Setting the folder to execute deployment scripts from
      hre.network.deploy = ['deploy/mainnet']

      const {
        // eslint-disable-next-line no-shadow
        MasterOracle,
        PriceProvidersAggregator,
        ChainlinkOracle,
        AlusdTokenMainnetOracle,
        StableCoinProvider,
        BTCPeggedTokenOracle,
      } = await deployments.fixture()

      const addressProvider = AddressProviderMock__factory.connect(Address.ADDRESS_PROVIDER, deployer)
      await addressProvider.updateProvidersAggregator(PriceProvidersAggregator.address)

      masterOracle = MasterOracle__factory.connect(MasterOracle.address, deployer)

      const defaultOracle = ChainlinkOracle__factory.connect(ChainlinkOracle.address, deployer)
      await defaultOracle.updateDefaultStalePeriod(ethers.constants.MaxUint256)
      await defaultOracle.updateCustomStalePeriod(USDC, ethers.constants.MaxUint256)
      await defaultOracle.updateCustomStalePeriod(USDT, ethers.constants.MaxUint256)
      await defaultOracle.updateCustomStalePeriod(DAI, ethers.constants.MaxUint256)

      const stableCoinProvider = StableCoinProvider__factory.connect(StableCoinProvider.address, deployer)
      await stableCoinProvider.updateDefaultStalePeriod(ethers.constants.MaxUint256)

      const alusdTokenMainnetOracle = AlusdTokenMainnetOracle__factory.connect(
        AlusdTokenMainnetOracle.address,
        deployer
      )
      await alusdTokenMainnetOracle.updateDefaultStalePeriod(ethers.constants.MaxUint256)
      await increaseTime(ethers.BigNumber.from(60 * 60 * 2))
      await alusdTokenMainnetOracle.update()

      const bTCPeggedTokenOracle = BTCPeggedTokenOracle__factory.connect(BTCPeggedTokenOracle.address, deployer)
      await bTCPeggedTokenOracle.updateDefaultStalePeriod(ethers.constants.MaxUint256)
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
        expect(price).closeTo(Quote.mainnet.CURVE_FRAX_3CRV_LP_USD, toUSD('0.02'))
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

      it('should get price for dola+3crv Pool', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(DOLA_3CRV_LP)

        // then
        expect(price).closeTo(Quote.mainnet.CURVE_DOLA_3CRV_LP_USD, toUSD('0.01'))
      })

      it('should get price for dola+fraxbp Pool', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(DOLA_FRAXBP_LP)

        // then
        expect(price).closeTo(Quote.mainnet.CURVE_DOLA_FRAXBP_LP_USD, toUSD('0.01'))
      })

      it('should get price for gusd Pool', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(GUSD_LP)

        // then
        expect(price).closeTo(Quote.mainnet.CURVE_GUSD_LP_USD, toUSD('0.01'))
      })

      it('should get price for ren Pool', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(REN_LP)

        // then
        expect(price).closeTo(Quote.mainnet.CURVE_REN_LP_USD, toUSD('0.01'))
      })

      it('should get price for fraxusdc Pool', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(FRAX_USDC_LP)

        // then
        expect(price).closeTo(Quote.mainnet.CURVE_FRAX_USDC_LP_USD, toUSD('0.01'))
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

    describe('VPool tokens', function () {
      it('should get price for vaUSDC', async function () {
        const price = await masterOracle.getPriceInUsd(vaUSDC)
        expect(price).closeTo(Quote.mainnet.vaUSDC_USD, toUSD('0.01'))
      })

      it('should get price for vaDAI', async function () {
        const price = await masterOracle.getPriceInUsd(vaDAI)
        expect(price).closeTo(Quote.mainnet.vaDAI_USD, toUSD('0.01'))
      })

      it('should get price for vaFRAX', async function () {
        const price = await masterOracle.getPriceInUsd(vaFRAX)
        expect(price).closeTo(Quote.mainnet.vaFRAX_USD, toUSD('0.01'))
      })

      it('should get price for vaETH', async function () {
        const price = await masterOracle.getPriceInUsd(vaETH)
        expect(price).closeTo(Quote.mainnet.vaETH_USD, toUSD('1'))
      })

      it('should get price for vastETH', async function () {
        const price = await masterOracle.getPriceInUsd(vastETH)
        expect(price).closeTo(Quote.mainnet.vastETH_USD, toUSD('1'))
      })

      it('should get price for vaWBTC', async function () {
        const price = await masterOracle.getPriceInUsd(vaWBTC)
        expect(price).closeTo(Quote.mainnet.vaWBTC_USD, toUSD('1'))
      })

      it('should get price for vaLINK', async function () {
        const price = await masterOracle.getPriceInUsd(vaLINK)
        expect(price).closeTo(Quote.mainnet.vaLINK_USD, toUSD('0.1'))
      })
    })

    describe('Synth', function () {
      it('should get price for msUSD', async function () {
        const price = await masterOracle.getPriceInUsd(msUSD)
        expect(price).eq(toUSD('1'))
      })

      it('should get price for msETH', async function () {
        const price = await masterOracle.getPriceInUsd(msETH)
        expect(price).closeTo(Quote.mainnet.ETH_USD, toUSD('5'))
      })

      it('should get price for msBTC', async function () {
        const price = await masterOracle.getPriceInUsd(msBTC)
        expect(price).closeTo(Quote.mainnet.BTC_USD, toUSD('50'))
      })

      it('should get price for msDOGE', async function () {
        const price = await masterOracle.getPriceInUsd(msDOGE)
        expect(price).closeTo(Quote.mainnet.DOGE_USD, toUSD('1'))
      })
    })

    describe('Frax', function () {
      describe('sFrxETH', function () {
        it('should get price for sFrxETH', async function () {
          // given
          const officialOracle = AggregatorV3Interface__factory.connect(
            '0x27942aFe4EcB7F9945168094e0749CAC749aC97B',
            deployer
          )
          const basePrice = (await officialOracle.latestRoundData()).answer

          // when
          const price = await masterOracle.getPriceInUsd(sFrxETH)

          // then
          expect(price).eq(basePrice)
          expect(price).closeTo(Quote.mainnet.ETH_USD, toUSD('30'))
        })

        it('should not be able to manipulate sFrxETH price (1)', async function () {
          // given
          const frxEth = IERC20__factory.connect(frxETH, deployer)
          const sFrxEth = ISFrxEth__factory.connect(sFrxETH, deployer)
          const priceBefore = await masterOracle.getPriceInUsd(sFrxETH)
          const staked = await frxEth.balanceOf(sFrxEth.address)
          const amount = staked.mul('10')
          await adjustBalance(frxEth.address, deployer.address, amount)

          // when
          await frxEth.approve(sFrxEth.address, ethers.constants.MaxUint256)
          await sFrxEth.deposit(amount, deployer.address)

          // then
          const priceAfter = await masterOracle.getPriceInUsd(sFrxETH)
          expect(priceAfter).closeTo(priceBefore, parseEther('0.0001'))
        })

        it('should not be able to manipulate sFrxETH price (2)', async function () {
          // given
          const ethFrxEthPool = ICurvePool__factory.connect('0xa1f8a6807c402e4a15ef4eba36528a3fed24e577', deployer)
          const frxEth = IERC20__factory.connect(frxETH, deployer)
          const sFrxEth = ISFrxEth__factory.connect(sFrxETH, deployer)
          const priceBefore = await masterOracle.getPriceInUsd(sFrxETH)
          const poolBalance = await ethers.provider.getBalance(ethFrxEthPool.address)
          const amountIn = poolBalance.mul('10')
          await ethFrxEthPool.exchange(0, 1, amountIn, 0, {value: amountIn})
          const amount = await frxEth.balanceOf(deployer.address)

          // when
          await frxEth.approve(sFrxEth.address, ethers.constants.MaxUint256)
          await sFrxEth.deposit(amount, deployer.address)

          // then
          const priceAfter = await masterOracle.getPriceInUsd(sFrxETH)
          expect(priceAfter).closeTo(priceBefore, parseEther('0.0001'))
        })
      })
    })
  })

  describe('MasterOracle @avalanche', function () {
    const {
      DAI,
      Curve: {REN_LP, AAVE_LP},
      Synth: {msBTC, msUSD, msUNI, msCRV, msAAVE},
    } = Address.avalanche

    before(async function () {
      // Setting the folder to execute deployment scripts from
      hre.network.deploy = ['deploy/avalanche']

      // eslint-disable-next-line no-shadow
      const {MasterOracle, PriceProvidersAggregator} = await deployments.fixture()

      const addressProvider = AddressProviderMock__factory.connect(Address.ADDRESS_PROVIDER, deployer)
      await addressProvider.updateProvidersAggregator(PriceProvidersAggregator.address)

      masterOracle = MasterOracle__factory.connect(MasterOracle.address, deployer)
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
      it('should get price for msBTC', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(msBTC)

        // then
        expect(price).closeTo(Quote.avalanche.BTC_USD, toUSD('50'))
      })

      it('should get price for msUSD', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(msUSD)

        // then
        expect(price).eq(toUSD('1'))
      })

      it('should get price for msUNI', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(msUNI)

        // then
        expect(price).closeTo(Quote.avalanche.UNI_USD, toUSD('0.01'))
      })

      it('should get price for msCRV', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(msCRV)

        // then
        expect(price).closeTo(Quote.avalanche.CRV_USD, toUSD('0.01'))
      })

      it('should get price for msAAVE', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(msAAVE)

        // then
        expect(price).closeTo(Quote.avalanche.AAVE_USD, toUSD('1'))
      })
    })
  })

  describe('MasterOracle @bsc', function () {
    const {
      WBNB,
      BUSD,
      Ellipsis: {VAL_3EPS_LP},
      Synth: {msBNB, msUSD},
    } = Address.bsc

    before(async function () {
      // Setting the folder to execute deployment scripts from
      hre.network.deploy = ['deploy/bsc']

      // eslint-disable-next-line no-shadow
      const {MasterOracle, PriceProvidersAggregator} = await deployments.fixture()

      const addressProvider = AddressProviderMock__factory.connect(Address.ADDRESS_PROVIDER, deployer)
      await addressProvider.updateProvidersAggregator(PriceProvidersAggregator.address)

      masterOracle = MasterOracle__factory.connect(MasterOracle.address, deployer)
    })

    describe('getPriceInUsd', function () {
      it('should revert if token oracle returns 0', async function () {
        // given
        const wbnbFakeOracle = await smock.fake('ITokenOracle')
        wbnbFakeOracle.getPriceInUsd.returns(0)
        await masterOracle.updateTokenOracle(WBNB, wbnbFakeOracle.address)

        // when-then
        expect(masterOracle.getPriceInUsd(WBNB)).to.revertedWith('invalid-token-price')
      })

      it('should get price for WBNB', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(WBNB)

        // then
        expect(price).closeTo(Quote.bsc.BNB_USD, toUSD('1'))
      })

      it('should get price for BUSD', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(BUSD)

        // then
        expect(price).closeTo(Quote.bsc.BUSD_USD, toUSD('1'))
      })
    })

    describe('Synth', function () {
      it('should get price for msUSD', async function () {
        const price = await masterOracle.getPriceInUsd(msUSD)
        expect(price).eq(toUSD('1'))
      })

      it('should get price for msBNB', async function () {
        const price = await masterOracle.getPriceInUsd(msBNB)
        expect(price).closeTo(Quote.bsc.BNB_USD, toUSD('5'))
      })
    })

    describe('Ellipsis LP Tokens', function () {
      it('should get price for val3EPS', async function () {
        // when
        const price = await masterOracle.getPriceInUsd(VAL_3EPS_LP)

        // then
        expect(price).closeTo(Quote.bsc.ELLIPSIS_VAL_3EPS, toUSD('0.01'))
      })
    })
  })
})
