/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {UniswapV2LikePriceProvider, IERC20} from '../../typechain-types'
import {Addresses} from '../../helpers/address'
import Quote from '../helpers/quotes'
import {parseEther, parseUnits, HOUR, increaseTime} from '../helpers'
import {FakeContract, smock} from '@defi-wonderland/smock'

const DEFAULT_TWAP_PERIOD = HOUR

describe('UniswapV2LikePriceProvider', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let alice: SignerWithAddress
  let dai: IERC20
  let usdc: IERC20
  let nativeToken: IERC20
  let wbtc: IERC20
  let stableCoinProvider: FakeContract
  let addressProvider: FakeContract

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer, alice] = await ethers.getSigners()

    addressProvider = await smock.fake('AddressProviderMock', {address: Addresses.ADDRESS_PROVIDER})
    addressProvider.governor.returns(deployer.address)
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('UniswapV2LikePriceProvider @mainnet', function () {
    const {DAI, WETH, WBTC, USDC, UNISWAP_V2_FACTORY_ADDRESS, SUSHISWAP_FACTORY_ADDRESS} = Addresses.mainnet

    beforeEach(async function () {
      dai = await ethers.getContractAt('@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20', DAI, deployer)
      nativeToken = await ethers.getContractAt('@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20', WETH, deployer)
      wbtc = await ethers.getContractAt('@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20', WBTC, deployer)
      usdc = await ethers.getContractAt('@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20', USDC, deployer)
    })

    describe('UniswapV2', function () {
      let priceProvider: UniswapV2LikePriceProvider

      beforeEach(async function () {
        const priceProviderFactory = await ethers.getContractFactory('UniswapV2LikePriceProvider', deployer)
        priceProvider = await priceProviderFactory.deploy(UNISWAP_V2_FACTORY_ADDRESS, DEFAULT_TWAP_PERIOD, WETH)
        await priceProvider.deployed()

        await priceProvider['updateOrAdd(address,address)'](DAI, WETH)
        await priceProvider['updateOrAdd(address,address)'](WBTC, WETH)
        await priceProvider['updateOrAdd(address,address)'](USDC, WETH)

        await increaseTime(DEFAULT_TWAP_PERIOD)

        await priceProvider['updateOrAdd(address,address)'](DAI, WETH)
        await priceProvider['updateOrAdd(address,address)'](WBTC, WETH)
        await priceProvider['updateOrAdd(address,address)'](USDC, WETH)

        stableCoinProvider = await smock.fake('StableCoinProvider')
        stableCoinProvider.getStableCoinIfPegged.returns(DAI)
        stableCoinProvider.toUsdRepresentation.returns((amount: string) => amount)
      })

      describe('updateDefaultTwapPeriod', function () {
        it('should revert if not governor', async function () {
          const tx = priceProvider.connect(alice).updateDefaultTwapPeriod(0)
          await expect(tx).revertedWith('not-governor')
        })

        it('should update default TWAP period', async function () {
          // given
          const before = await priceProvider.defaultTwapPeriod()
          expect(before).eq(DEFAULT_TWAP_PERIOD).gt(0)

          // when
          const defaultTwap = before.mul('2')
          await priceProvider.updateDefaultTwapPeriod(defaultTwap)

          // then
          const after = await priceProvider.defaultTwapPeriod()
          expect(after).eq(defaultTwap)
        })
      })

      describe('updateOrAdd', function () {
        it('should create oracle if does not exist', async function () {
          // given
          const pair = await priceProvider.pairFor(DAI, WBTC)
          expect(await priceProvider['hasOracle(address)'](pair)).false

          // when
          await priceProvider['updateOrAdd(address,address)'](DAI, WBTC)

          // then
          expect(await priceProvider['hasOracle(address)'](pair)).true
        })

        it('should create oracle for the same pair with different TWAP periods', async function () {
          // given
          const pair = await priceProvider.pairFor(DAI, WBTC)
          const twapPeriod0 = HOUR
          const twapPeriod1 = HOUR.div('2')
          expect(await priceProvider['hasOracle(address,uint256)'](pair, twapPeriod0)).false
          expect(await priceProvider['hasOracle(address,uint256)'](pair, twapPeriod1)).false

          // when
          await priceProvider['updateOrAdd(address,address,uint256)'](DAI, WBTC, twapPeriod0)
          await priceProvider['updateOrAdd(address,address,uint256)'](DAI, WBTC, twapPeriod1)

          // then
          expect(await priceProvider['hasOracle(address,uint256)'](pair, twapPeriod0)).true
          expect(await priceProvider['hasOracle(address,uint256)'](pair, twapPeriod1)).true
        })

        it('should update oracle if it exists', async function () {
          // given
          const pair = await priceProvider.pairFor(DAI, WETH)
          const {blockTimestampLast: before} = await priceProvider.oracles(pair, DEFAULT_TWAP_PERIOD)

          // when
          await increaseTime(HOUR.mul('10'))
          await priceProvider['updateOrAdd(address,address,uint256)'](DAI, WETH, DEFAULT_TWAP_PERIOD)

          // then
          const {blockTimestampLast: after} = await priceProvider.oracles(pair, DEFAULT_TWAP_PERIOD)
          expect(after).gt(before)
        })
      })

      describe('quote', function () {
        it('should quote same token to same token', async function () {
          const amountIn = parseEther('100')
          const {_amountOut} = await priceProvider['quote(address,address,uint256)'](
            nativeToken.address,
            nativeToken.address,
            amountIn
          )
          expect(_amountOut).eq(amountIn)
        })

        it('should quote using NATIVE-USDC path', async function () {
          const {_amountOut} = await priceProvider['quote(address,address,uint256)'](
            nativeToken.address,
            usdc.address,
            parseEther('1')
          )
          expect(_amountOut).closeTo(Quote.mainnet.ETH_USD.div(`${1e12}`), parseUnits('5', 6))
        })

        it('should quote using WBTC-NATIVE-USDC', async function () {
          const {_amountOut} = await priceProvider['quote(address,address,uint256)'](
            wbtc.address,
            usdc.address,
            parseUnits('1', 8)
          )
          expect(_amountOut).closeTo(Quote.mainnet.BTC_USD.div(`${1e12}`), parseUnits('200', 6))
        })
      })

      describe('getPriceInUsd', function () {
        it('should revert if stable coin provider is null', async function () {
          const tx = priceProvider['getPriceInUsd(address)'](WETH)
          await expect(tx).revertedWith('stable-coin-not-supported')
        })

        describe('when stable coin provider is set', function () {
          beforeEach(async function () {
            addressProvider.stableCoinProvider.returns(stableCoinProvider.address)
          })

          it('should WETH price', async function () {
            const {_priceInUsd} = await priceProvider['getPriceInUsd(address)'](WETH)
            expect(_priceInUsd).closeTo(Quote.mainnet.ETH_USD, parseEther('10'))
          })

          it('should WBTC price', async function () {
            const {_priceInUsd} = await priceProvider['getPriceInUsd(address)'](WBTC)
            expect(_priceInUsd).closeTo(Quote.mainnet.BTC_USD, parseEther('500'))
          })

          it('should DAI price', async function () {
            const {_priceInUsd} = await priceProvider['getPriceInUsd(address)'](DAI)
            expect(_priceInUsd).closeTo(parseEther('1'), parseEther('0.1'))
          })
        })
      })
    })

    describe('Sushiswap', function () {
      let priceProvider: UniswapV2LikePriceProvider

      beforeEach(async function () {
        const priceProviderFactory = await ethers.getContractFactory('UniswapV2LikePriceProvider', deployer)
        priceProvider = await priceProviderFactory.deploy(SUSHISWAP_FACTORY_ADDRESS, DEFAULT_TWAP_PERIOD, WETH)
        await priceProvider.deployed()

        await priceProvider['updateOrAdd(address,address)'](DAI, WETH)
        await priceProvider['updateOrAdd(address,address)'](WBTC, WETH)

        await increaseTime(DEFAULT_TWAP_PERIOD)

        await priceProvider['updateOrAdd(address,address)'](DAI, WETH)
        await priceProvider['updateOrAdd(address,address)'](WBTC, WETH)
      })

      describe('quote', function () {
        it('should quote same token to same token', async function () {
          const amountIn = parseEther('100')
          const {_amountOut} = await priceProvider['quote(address,address,uint256)'](
            nativeToken.address,
            nativeToken.address,
            amountIn
          )
          expect(_amountOut).eq(amountIn)
        })

        it('should quote using NATIVE-DAI path', async function () {
          const {_amountOut} = await priceProvider['quote(address,address,uint256)'](
            nativeToken.address,
            dai.address,
            parseEther('1')
          )
          expect(_amountOut).closeTo(Quote.mainnet.ETH_USD, parseEther('100'))
        })

        it('should quote using WBTC-NATIVE-DAI', async function () {
          const {_amountOut} = await priceProvider['quote(address,address,uint256)'](
            wbtc.address,
            dai.address,
            parseUnits('1', 8)
          )
          expect(_amountOut).closeTo(Quote.mainnet.BTC_USD, parseEther('200'))
        })
      })
    })
  })

  describe('UniswapV2LikePriceProvider @avalanche', function () {
    const {DAI, WAVAX, WBTC, TRADERJOE_FACTORY_ADDRESS, PANGOLIN_FACTORY_ADDRESS} = Addresses.avalanche

    beforeEach(async function () {
      dai = await ethers.getContractAt('@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20', DAI, deployer)
      nativeToken = await ethers.getContractAt('@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20', WAVAX, deployer)
      wbtc = await ethers.getContractAt('@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20', WBTC, deployer)
    })

    describe('TraderJoe', function () {
      let priceProvider: UniswapV2LikePriceProvider

      beforeEach(async function () {
        const priceProviderFactory = await ethers.getContractFactory('UniswapV2LikePriceProvider', deployer)
        priceProvider = await priceProviderFactory.deploy(TRADERJOE_FACTORY_ADDRESS, DEFAULT_TWAP_PERIOD, WAVAX)
        await priceProvider.deployed()

        await priceProvider['updateOrAdd(address,address)'](DAI, WAVAX)
        await priceProvider['updateOrAdd(address,address)'](WBTC, WAVAX)

        await increaseTime(DEFAULT_TWAP_PERIOD)

        await priceProvider['updateOrAdd(address,address)'](DAI, WAVAX)
        await priceProvider['updateOrAdd(address,address)'](WBTC, WAVAX)
      })

      describe('quote', function () {
        it('should quote same token to same token', async function () {
          const amountIn = parseEther('100')
          const {_amountOut} = await priceProvider['quote(address,address,uint256)'](
            nativeToken.address,
            nativeToken.address,
            amountIn
          )
          expect(_amountOut).eq(amountIn)
        })

        it('should quote using NATIVE-DAI path', async function () {
          const {_amountOut} = await priceProvider['quote(address,address,uint256)'](
            nativeToken.address,
            dai.address,
            parseEther('1')
          )
          expect(_amountOut).closeTo(Quote.avalanche.AVAX_USD, parseEther('1'))
        })

        it('should quote using WBTC-NATIVE-DAI', async function () {
          const {_amountOut} = await priceProvider['quote(address,address,uint256)'](
            wbtc.address,
            dai.address,
            parseUnits('1', 8)
          )
          expect(_amountOut).closeTo(Quote.avalanche.BTC_USD, parseEther('1'))
        })
      })
    })

    describe('Pangolin', function () {
      let priceProvider: UniswapV2LikePriceProvider

      beforeEach(async function () {
        const priceProviderFactory = await ethers.getContractFactory('UniswapV2LikePriceProvider', deployer)
        priceProvider = await priceProviderFactory.deploy(PANGOLIN_FACTORY_ADDRESS, DEFAULT_TWAP_PERIOD, WAVAX)
        await priceProvider.deployed()

        await priceProvider['updateOrAdd(address,address)'](DAI, WAVAX)
        await priceProvider['updateOrAdd(address,address)'](WBTC, WAVAX)

        await increaseTime(DEFAULT_TWAP_PERIOD)

        await priceProvider['updateOrAdd(address,address)'](DAI, WAVAX)
        await priceProvider['updateOrAdd(address,address)'](WBTC, WAVAX)
      })

      describe('quote', function () {
        it('should quote same token to same token', async function () {
          const amountIn = parseEther('100')
          const {_amountOut} = await priceProvider['quote(address,address,uint256)'](
            nativeToken.address,
            nativeToken.address,
            amountIn
          )
          expect(_amountOut).eq(amountIn)
        })

        it('should quote using NATIVE-DAI path', async function () {
          const {_amountOut} = await priceProvider['quote(address,address,uint256)'](
            nativeToken.address,
            dai.address,
            parseEther('1')
          )
          expect(_amountOut).closeTo(Quote.avalanche.AVAX_USD, parseEther('1'))
        })

        it('should quote using WBTC-NATIVE-DAI', async function () {
          const {_amountOut} = await priceProvider['quote(address,address,uint256)'](
            wbtc.address,
            dai.address,
            parseUnits('1', 8)
          )
          expect(_amountOut).closeTo(Quote.avalanche.BTC_USD, parseEther('25'))
          // BTC_USD: parseEther('20,058'),
        })
      })
    })
  })

  describe('UniswapV2LikePriceProvider @polygon', function () {
    const {DAI, WMATIC, WBTC, SUSHISWAP_FACTORY_ADDRESS, QUICKSWAP_FACTORY_ADDRESS} = Addresses.polygon

    beforeEach(async function () {
      dai = await ethers.getContractAt('@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20', DAI, deployer)
      nativeToken = await ethers.getContractAt(
        '@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20',
        WMATIC,
        deployer
      )
      wbtc = await ethers.getContractAt('@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20', WBTC, deployer)
    })

    describe('Sushiswap', function () {
      let priceProvider: UniswapV2LikePriceProvider

      beforeEach(async function () {
        const priceProviderFactory = await ethers.getContractFactory('UniswapV2LikePriceProvider', deployer)
        priceProvider = await priceProviderFactory.deploy(SUSHISWAP_FACTORY_ADDRESS, DEFAULT_TWAP_PERIOD, WMATIC)
        await priceProvider.deployed()

        await priceProvider['updateOrAdd(address,address)'](DAI, WMATIC)
        await priceProvider['updateOrAdd(address,address)'](WBTC, WMATIC)

        await increaseTime(DEFAULT_TWAP_PERIOD)

        await priceProvider['updateOrAdd(address,address)'](DAI, WMATIC)
        await priceProvider['updateOrAdd(address,address)'](WBTC, WMATIC)
      })

      describe('quote', function () {
        it('should quote same token to same token', async function () {
          const amountIn = parseEther('100')
          const {_amountOut} = await priceProvider['quote(address,address,uint256)'](
            nativeToken.address,
            nativeToken.address,
            amountIn
          )
          expect(_amountOut).eq(amountIn)
        })

        it('should quote using NATIVE-DAI path', async function () {
          const {_amountOut} = await priceProvider['quote(address,address,uint256)'](
            nativeToken.address,
            dai.address,
            parseEther('1')
          )
          expect(_amountOut).closeTo(Quote.polygon.MATIC_USD, parseEther('0.1'))
        })

        it('should quote using WBTC-NATIVE-DAI', async function () {
          const {_amountOut} = await priceProvider['quote(address,address,uint256)'](
            wbtc.address,
            dai.address,
            parseUnits('1', 8)
          )
          expect(_amountOut).closeTo(Quote.polygon.BTC_USD, parseEther('10'))
        })
      })
    })

    describe('Quickswap', function () {
      let priceProvider: UniswapV2LikePriceProvider

      beforeEach(async function () {
        const priceProviderFactory = await ethers.getContractFactory('UniswapV2LikePriceProvider', deployer)
        priceProvider = await priceProviderFactory.deploy(QUICKSWAP_FACTORY_ADDRESS, DEFAULT_TWAP_PERIOD, WMATIC)
        await priceProvider.deployed()

        await priceProvider['updateOrAdd(address,address)'](DAI, WMATIC)
        await priceProvider['updateOrAdd(address,address)'](WBTC, WMATIC)

        await increaseTime(DEFAULT_TWAP_PERIOD)

        await priceProvider['updateOrAdd(address,address)'](DAI, WMATIC)
        await priceProvider['updateOrAdd(address,address)'](WBTC, WMATIC)
      })

      describe('quote', function () {
        it('should quote same token to same token', async function () {
          const amountIn = parseEther('100')
          const {_amountOut} = await priceProvider['quote(address,address,uint256)'](
            nativeToken.address,
            nativeToken.address,
            amountIn
          )
          expect(_amountOut).eq(amountIn)
        })

        it('should quote using NATIVE-DAI path', async function () {
          const {_amountOut} = await priceProvider['quote(address,address,uint256)'](
            nativeToken.address,
            dai.address,
            parseEther('1')
          )
          expect(_amountOut).closeTo(Quote.polygon.MATIC_USD, parseEther('0.1'))
        })

        it('should quote using WBTC-NATIVE-DAI', async function () {
          const {_amountOut} = await priceProvider['quote(address,address,uint256)'](
            wbtc.address,
            dai.address,
            parseUnits('1', 8)
          )
          expect(_amountOut).closeTo(Quote.polygon.BTC_USD, parseEther('100'))
        })
      })
    })
  })
})
