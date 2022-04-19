/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {
  UniswapV2LikePriceProvider,
  UniswapV2LikePriceProvider__factory,
  IERC20,
  IERC20__factory,
} from '../../typechain-types'
import Address from '../../helpers/address'
import {parseEther, parseUnits, HOUR, increaseTime} from '../helpers'

const DEFAULT_TWAP_PERIOD = HOUR

describe('UniswapV2LikePriceProvider', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let governor: SignerWithAddress
  let dai: IERC20
  let usdc: IERC20
  let nativeToken: IERC20
  let wbtc: IERC20

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer, governor] = await ethers.getSigners()
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('UniswapV2LikePriceProvider @mainnet', function () {
    const {
      DAI_ADDRESS,
      WETH_ADDRESS,
      WBTC_ADDRESS,
      USDC_ADDRESS,
      UNISWAP_V2_FACTORY_ADDRESS,
      SUSHISWAP_FACTORY_ADDRESS,
    } = Address.mainnet

    beforeEach(async function () {
      dai = IERC20__factory.connect(DAI_ADDRESS, deployer)
      nativeToken = IERC20__factory.connect(WETH_ADDRESS, deployer)
      wbtc = IERC20__factory.connect(WBTC_ADDRESS, deployer)
      usdc = IERC20__factory.connect(USDC_ADDRESS, deployer)
    })

    describe('quote', function () {
      describe('UniswapV2', function () {
        let priceProvider: UniswapV2LikePriceProvider

        beforeEach(async function () {
          const priceProviderFactory = new UniswapV2LikePriceProvider__factory(deployer)
          priceProvider = await priceProviderFactory.deploy(
            UNISWAP_V2_FACTORY_ADDRESS,
            DEFAULT_TWAP_PERIOD,
            WETH_ADDRESS
          )
          await priceProvider.deployed()
          await priceProvider.transferGovernorship(governor.address)
          await priceProvider.connect(governor).acceptGovernorship()

          await priceProvider['updateOrAdd(address)'](await priceProvider.pairFor(DAI_ADDRESS, WETH_ADDRESS))
          await priceProvider['updateOrAdd(address)'](await priceProvider.pairFor(WBTC_ADDRESS, WETH_ADDRESS))
          await priceProvider['updateOrAdd(address)'](await priceProvider.pairFor(USDC_ADDRESS, WETH_ADDRESS))

          await increaseTime(DEFAULT_TWAP_PERIOD)

          await priceProvider['updateOrAdd(address)'](await priceProvider.pairFor(DAI_ADDRESS, WETH_ADDRESS))
          await priceProvider['updateOrAdd(address)'](await priceProvider.pairFor(WBTC_ADDRESS, WETH_ADDRESS))
          await priceProvider['updateOrAdd(address)'](await priceProvider.pairFor(USDC_ADDRESS, WETH_ADDRESS))
        })

        describe('updateDefaultTwapPeriod', function () {
          it('should revert if not governor', async function () {
            const tx = priceProvider.updateDefaultTwapPeriod(0)
            await expect(tx).revertedWith('not-governor')
          })

          it('should update default TWAP period', async function () {
            // given
            const before = await priceProvider.defaultTwapPeriod()
            expect(before).eq(DEFAULT_TWAP_PERIOD).gt(0)

            // when
            const defaultTwap = before.mul('2')
            await priceProvider.connect(governor).updateDefaultTwapPeriod(defaultTwap)

            // then
            const after = await priceProvider.defaultTwapPeriod()
            expect(after).eq(defaultTwap)
          })
        })

        describe('updateOrAdd', function () {
          it('should create oracle if does not exist', async function () {
            // given
            const pair = await priceProvider.pairFor(DAI_ADDRESS, WBTC_ADDRESS)
            expect(await priceProvider['hasOracle(address)'](pair)).false

            // when
            await priceProvider['updateOrAdd(address)'](pair)

            // then
            expect(await priceProvider['hasOracle(address)'](pair)).true
          })

          it('should create oracle for the same pair with different TWAP periods', async function () {
            // given
            const pair = await priceProvider.pairFor(DAI_ADDRESS, WBTC_ADDRESS)
            const twapPeriod0 = HOUR
            const twapPeriod1 = HOUR.div('2')
            expect(await priceProvider['hasOracle(address,uint256)'](pair, twapPeriod0)).false
            expect(await priceProvider['hasOracle(address,uint256)'](pair, twapPeriod1)).false

            // when
            await priceProvider['updateOrAdd(address,uint256)'](pair, twapPeriod0)
            await priceProvider['updateOrAdd(address,uint256)'](pair, twapPeriod1)

            // then
            expect(await priceProvider['hasOracle(address,uint256)'](pair, twapPeriod0)).true
            expect(await priceProvider['hasOracle(address,uint256)'](pair, twapPeriod1)).true
          })

          it('should update oracle if it exists', async function () {
            // given
            const pair = await priceProvider.pairFor(DAI_ADDRESS, WETH_ADDRESS)
            const {blockTimestampLast: before} = await priceProvider.oracles(pair, DEFAULT_TWAP_PERIOD)

            // when
            await increaseTime(HOUR.mul('10'))
            await priceProvider['updateOrAdd(address,uint256)'](pair, DEFAULT_TWAP_PERIOD)

            // then
            const {blockTimestampLast: after} = await priceProvider.oracles(pair, DEFAULT_TWAP_PERIOD)
            expect(after).gt(before)
          })
        })

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
          expect(_amountOut).closeTo(parseUnits('3,236', 6), parseUnits('1', 6))
        })

        it('should quote using WBTC-NATIVE-USDC', async function () {
          const {_amountOut} = await priceProvider['quote(address,address,uint256)'](
            wbtc.address,
            usdc.address,
            parseUnits('1', 8)
          )
          expect(_amountOut).closeTo(parseUnits('43,784', 6), parseUnits('1', 6))
        })
      })

      describe('Sushiswap', function () {
        let priceProvider: UniswapV2LikePriceProvider

        beforeEach(async function () {
          const priceProviderFactory = new UniswapV2LikePriceProvider__factory(deployer)
          priceProvider = await priceProviderFactory.deploy(
            SUSHISWAP_FACTORY_ADDRESS,
            DEFAULT_TWAP_PERIOD,
            WETH_ADDRESS
          )
          await priceProvider.deployed()
          await priceProvider.transferGovernorship(governor.address)
          await priceProvider.connect(governor).acceptGovernorship()

          await priceProvider['updateOrAdd(address)'](await priceProvider.pairFor(DAI_ADDRESS, WETH_ADDRESS))
          await priceProvider['updateOrAdd(address)'](await priceProvider.pairFor(WBTC_ADDRESS, WETH_ADDRESS))

          await increaseTime(DEFAULT_TWAP_PERIOD)

          await priceProvider['updateOrAdd(address)'](await priceProvider.pairFor(DAI_ADDRESS, WETH_ADDRESS))
          await priceProvider['updateOrAdd(address)'](await priceProvider.pairFor(WBTC_ADDRESS, WETH_ADDRESS))
        })

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
          expect(_amountOut).closeTo(parseEther('3,238'), parseEther('1'))
        })

        it('should quote using WBTC-NATIVE-DAI', async function () {
          const {_amountOut} = await priceProvider['quote(address,address,uint256)'](
            wbtc.address,
            dai.address,
            parseUnits('1', 8)
          )
          expect(_amountOut).closeTo(parseEther('43,813'), parseEther('1'))
        })
      })
    })
  })

  describe('UniswapV2LikePriceProvider @avalanche', function () {
    const {DAI_ADDRESS, WAVAX_ADDRESS, WBTC_ADDRESS, TRADERJOE_FACTORY_ADDRESS, PANGOLIN_FACTORY_ADDRESS} =
      Address.avalanche

    beforeEach(async function () {
      dai = IERC20__factory.connect(DAI_ADDRESS, deployer)
      nativeToken = IERC20__factory.connect(WAVAX_ADDRESS, deployer)
      wbtc = IERC20__factory.connect(WBTC_ADDRESS, deployer)
    })

    describe('quote', function () {
      describe('TraderJoe', function () {
        let priceProvider: UniswapV2LikePriceProvider

        beforeEach(async function () {
          const priceProviderFactory = new UniswapV2LikePriceProvider__factory(deployer)
          priceProvider = await priceProviderFactory.deploy(
            TRADERJOE_FACTORY_ADDRESS,
            DEFAULT_TWAP_PERIOD,
            WAVAX_ADDRESS
          )
          await priceProvider.deployed()
          await priceProvider.transferGovernorship(governor.address)
          await priceProvider.connect(governor).acceptGovernorship()

          await priceProvider['updateOrAdd(address)'](await priceProvider.pairFor(DAI_ADDRESS, WAVAX_ADDRESS))
          await priceProvider['updateOrAdd(address)'](await priceProvider.pairFor(WBTC_ADDRESS, WAVAX_ADDRESS))

          await increaseTime(DEFAULT_TWAP_PERIOD)

          await priceProvider['updateOrAdd(address)'](await priceProvider.pairFor(DAI_ADDRESS, WAVAX_ADDRESS))
          await priceProvider['updateOrAdd(address)'](await priceProvider.pairFor(WBTC_ADDRESS, WAVAX_ADDRESS))
        })

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
          expect(_amountOut).closeTo(parseEther('86'), parseEther('1'))
        })

        it('should quote using WBTC-NATIVE-DAI', async function () {
          const {_amountOut} = await priceProvider['quote(address,address,uint256)'](
            wbtc.address,
            dai.address,
            parseUnits('1', 8)
          )
          expect(_amountOut).closeTo(parseEther('42,750'), parseEther('1'))
        })
      })

      describe('Pangolin', function () {
        let priceProvider: UniswapV2LikePriceProvider

        beforeEach(async function () {
          const priceProviderFactory = new UniswapV2LikePriceProvider__factory(deployer)
          priceProvider = await priceProviderFactory.deploy(
            PANGOLIN_FACTORY_ADDRESS,
            DEFAULT_TWAP_PERIOD,
            WAVAX_ADDRESS
          )
          await priceProvider.deployed()
          await priceProvider.transferGovernorship(governor.address)
          await priceProvider.connect(governor).acceptGovernorship()

          await priceProvider['updateOrAdd(address)'](await priceProvider.pairFor(DAI_ADDRESS, WAVAX_ADDRESS))
          await priceProvider['updateOrAdd(address)'](await priceProvider.pairFor(WBTC_ADDRESS, WAVAX_ADDRESS))

          await increaseTime(DEFAULT_TWAP_PERIOD)

          await priceProvider['updateOrAdd(address)'](await priceProvider.pairFor(DAI_ADDRESS, WAVAX_ADDRESS))
          await priceProvider['updateOrAdd(address)'](await priceProvider.pairFor(WBTC_ADDRESS, WAVAX_ADDRESS))
        })

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
          expect(_amountOut).closeTo(parseEther('86'), parseEther('1'))
        })

        it('should quote using WBTC-NATIVE-DAI', async function () {
          const {_amountOut} = await priceProvider['quote(address,address,uint256)'](
            wbtc.address,
            dai.address,
            parseUnits('1', 8)
          )
          expect(_amountOut).closeTo(parseEther('42,626'), parseEther('1'))
        })
      })
    })
  })

  describe('UniswapV2LikePriceProvider @arbitrum', function () {
    const {DAI_ADDRESS, WETH_ADDRESS, WBTC_ADDRESS, SUSHISWAP_FACTORY_ADDRESS} = Address.arbitrum

    beforeEach(async function () {
      dai = IERC20__factory.connect(DAI_ADDRESS, deployer)
      nativeToken = IERC20__factory.connect(WETH_ADDRESS, deployer)
      wbtc = IERC20__factory.connect(WBTC_ADDRESS, deployer)
    })

    describe('quote', function () {
      describe('Sushiswap', function () {
        let priceProvider: UniswapV2LikePriceProvider

        beforeEach(async function () {
          const priceProviderFactory = new UniswapV2LikePriceProvider__factory(deployer)
          priceProvider = await priceProviderFactory.deploy(
            SUSHISWAP_FACTORY_ADDRESS,
            DEFAULT_TWAP_PERIOD,
            WETH_ADDRESS
          )
          await priceProvider.deployed()
          await priceProvider.transferGovernorship(governor.address)
          await priceProvider.connect(governor).acceptGovernorship()

          await priceProvider['updateOrAdd(address)'](await priceProvider.pairFor(DAI_ADDRESS, WETH_ADDRESS))
          await priceProvider['updateOrAdd(address)'](await priceProvider.pairFor(WBTC_ADDRESS, WETH_ADDRESS))

          await increaseTime(DEFAULT_TWAP_PERIOD)

          await priceProvider['updateOrAdd(address)'](await priceProvider.pairFor(DAI_ADDRESS, WETH_ADDRESS))
          await priceProvider['updateOrAdd(address)'](await priceProvider.pairFor(WBTC_ADDRESS, WETH_ADDRESS))
        })

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
          expect(_amountOut).closeTo(parseEther('3,002'), parseEther('1'))
        })

        it('should quote using WBTC-NATIVE-DAI', async function () {
          const {_amountOut} = await priceProvider['quote(address,address,uint256)'](
            wbtc.address,
            dai.address,
            parseUnits('1', 8)
          )
          expect(_amountOut).closeTo(parseEther('40,626'), parseEther('1'))
        })
      })
    })
  })

  describe('UniswapV2LikePriceProvider @polygon', function () {
    const {DAI_ADDRESS, WMATIC_ADDRESS, WBTC_ADDRESS, SUSHISWAP_FACTORY_ADDRESS, QUICKSWAP_FACTORY_ADDRESS} =
      Address.polygon

    beforeEach(async function () {
      dai = IERC20__factory.connect(DAI_ADDRESS, deployer)
      nativeToken = IERC20__factory.connect(WMATIC_ADDRESS, deployer)
      wbtc = IERC20__factory.connect(WBTC_ADDRESS, deployer)
    })

    describe('quote', function () {
      describe('Sushiswap', function () {
        let priceProvider: UniswapV2LikePriceProvider

        beforeEach(async function () {
          const priceProviderFactory = new UniswapV2LikePriceProvider__factory(deployer)
          priceProvider = await priceProviderFactory.deploy(
            SUSHISWAP_FACTORY_ADDRESS,
            DEFAULT_TWAP_PERIOD,
            WMATIC_ADDRESS
          )
          await priceProvider.deployed()
          await priceProvider.transferGovernorship(governor.address)
          await priceProvider.connect(governor).acceptGovernorship()

          await priceProvider['updateOrAdd(address)'](await priceProvider.pairFor(DAI_ADDRESS, WMATIC_ADDRESS))
          await priceProvider['updateOrAdd(address)'](await priceProvider.pairFor(WBTC_ADDRESS, WMATIC_ADDRESS))

          await increaseTime(DEFAULT_TWAP_PERIOD)

          await priceProvider['updateOrAdd(address)'](await priceProvider.pairFor(DAI_ADDRESS, WMATIC_ADDRESS))
          await priceProvider['updateOrAdd(address)'](await priceProvider.pairFor(WBTC_ADDRESS, WMATIC_ADDRESS))
        })

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
          expect(_amountOut).closeTo(parseEther('1.35'), parseEther('0.1'))
        })

        it('should quote using WBTC-NATIVE-DAI', async function () {
          const {_amountOut} = await priceProvider['quote(address,address,uint256)'](
            wbtc.address,
            dai.address,
            parseUnits('1', 8)
          )
          expect(_amountOut).closeTo(parseEther('40,832'), parseEther('1'))
        })
      })

      describe('Quickswap', function () {
        let priceProvider: UniswapV2LikePriceProvider

        beforeEach(async function () {
          const priceProviderFactory = new UniswapV2LikePriceProvider__factory(deployer)
          priceProvider = await priceProviderFactory.deploy(
            QUICKSWAP_FACTORY_ADDRESS,
            DEFAULT_TWAP_PERIOD,
            WMATIC_ADDRESS
          )
          await priceProvider.deployed()
          await priceProvider.transferGovernorship(governor.address)
          await priceProvider.connect(governor).acceptGovernorship()

          await priceProvider['updateOrAdd(address)'](await priceProvider.pairFor(DAI_ADDRESS, WMATIC_ADDRESS))
          await priceProvider['updateOrAdd(address)'](await priceProvider.pairFor(WBTC_ADDRESS, WMATIC_ADDRESS))

          await increaseTime(DEFAULT_TWAP_PERIOD)

          await priceProvider['updateOrAdd(address)'](await priceProvider.pairFor(DAI_ADDRESS, WMATIC_ADDRESS))
          await priceProvider['updateOrAdd(address)'](await priceProvider.pairFor(WBTC_ADDRESS, WMATIC_ADDRESS))
        })

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
          expect(_amountOut).closeTo(parseEther('1.35'), parseEther('0.1'))
        })

        it('should quote using WBTC-NATIVE-DAI', async function () {
          const {_amountOut} = await priceProvider['quote(address,address,uint256)'](
            wbtc.address,
            dai.address,
            parseUnits('1', 8)
          )
          expect(_amountOut).closeTo(parseEther('40,739'), parseEther('1'))
        })
      })
    })
  })
})
