/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {
  UniswapV3CrossPoolOracle__factory,
  UniswapV3PriceProvider,
  UniswapV3PriceProvider__factory,
  IERC20,
  IERC20__factory,
} from '../../typechain-types'
import Address from '../../helpers/address'
import {parseEther, parseUnits, HOUR} from '../helpers'
import {FakeContract, smock} from '@defi-wonderland/smock'
import {BigNumber} from 'ethers'

const DEFAULT_TWAP_PERIOD = HOUR
const DEFAULT_POOLS_FEE = 3000 // 0.3%

describe('UniswapV3PriceProvider', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let alice: SignerWithAddress
  let usdc: IERC20
  let weth: IERC20
  let wbtc: IERC20
  let priceProvider: UniswapV3PriceProvider
  let addressProvider: FakeContract

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer, alice] = await ethers.getSigners()

    addressProvider = await smock.fake('AddressProvider', {address: Address.ADDRESS_PROVIDER})
    addressProvider.governor.returns(deployer.address)
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('UniswapV3PriceProvider @mainnet', function () {
    const {USDC_ADDRESS, WETH_ADDRESS, WBTC_ADDRESS} = Address.mainnet

    beforeEach(async function () {
      usdc = IERC20__factory.connect(USDC_ADDRESS, deployer)
      weth = IERC20__factory.connect(WETH_ADDRESS, deployer)
      wbtc = IERC20__factory.connect(WBTC_ADDRESS, deployer)

      const crossPoolOracleFactory = new UniswapV3CrossPoolOracle__factory(deployer)
      const crossPoolOracle = await crossPoolOracleFactory.deploy(weth.address)
      await crossPoolOracle.deployed()

      const priceProviderFactory = new UniswapV3PriceProvider__factory(deployer)
      priceProvider = await priceProviderFactory.deploy(crossPoolOracle.address, DEFAULT_TWAP_PERIOD, DEFAULT_POOLS_FEE)
      await priceProvider.deployed()
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
        const newDefaultTwap = before * 2
        await priceProvider.updateDefaultTwapPeriod(newDefaultTwap)

        // then
        const after = await priceProvider.defaultTwapPeriod()
        expect(after).eq(newDefaultTwap)
      })
    })

    describe('updateDefaultPoolFee', function () {
      it('should revert if not governor', async function () {
        const tx = priceProvider.connect(alice).updateDefaultPoolFee(0)
        await expect(tx).revertedWith('not-governor')
      })

      it('should update default pool fee', async function () {
        // given
        const before = await priceProvider.defaultPoolFee()
        expect(before).eq(DEFAULT_POOLS_FEE).gt(0)

        // when
        const newDefaultPoolFee = before * 2
        await priceProvider.updateDefaultPoolFee(newDefaultPoolFee)

        // then
        const after = await priceProvider.defaultPoolFee()
        expect(after).eq(newDefaultPoolFee)
      })
    })

    describe('quote', function () {
      it('should quote same token to same token', async function () {
        const amountIn = parseEther('100')
        const {_amountOut} = await priceProvider['quote(address,address,uint256)'](weth.address, weth.address, amountIn)
        expect(_amountOut).eq(amountIn)
      })

      it('should quote using NATIVE-USDC path', async function () {
        const {_amountOut} = await priceProvider['quote(address,address,uint256)'](
          weth.address,
          usdc.address,
          parseEther('1')
        )
        expect(_amountOut).closeTo(parseUnits('3,230', 6), parseUnits('1', 6))
      })

      it('should quote using WBTC-NATIVE-USDC', async function () {
        const {_amountOut} = await priceProvider['quote(address,address,uint256)'](
          wbtc.address,
          usdc.address,
          parseUnits('1', 8)
        )
        expect(_amountOut).closeTo(parseUnits('43,711', 6), parseUnits('1', 6))
      })

      it('should quote using WBTC-NATIVE-USDC with 0.05% fee pools', async function () {
        const poolFee = 500
        const {_amountOut} = await priceProvider['quote(address,address,uint24,uint256)'](
          wbtc.address,
          usdc.address,
          poolFee,
          parseUnits('1', 8)
        )
        expect(_amountOut).closeTo(parseUnits('43,676', 6), parseUnits('1', 6))
      })
    })

    describe('getPriceInUsd', function () {
      it('should revert if stable coin provider is null', async function () {
        const tx = priceProvider['getPriceInUsd(address)'](WETH_ADDRESS)
        await expect(tx).revertedWith('stable-coin-not-supported')
      })

      describe('when stable coin provider is set', function () {
        let stableCoinProvider: FakeContract

        beforeEach(async function () {
          stableCoinProvider = await smock.fake('StableCoinProvider')
          stableCoinProvider.getStableCoinIfPegged.returns(USDC_ADDRESS)
          stableCoinProvider.toUsdRepresentation.returns((args: BigNumber[]) => {
            const [stableCoinAmount_] = args
            return stableCoinAmount_.mul(parseUnits('1', 12)) // USDC amount to 18 decimals
          })

          addressProvider.stableCoinProvider.returns(stableCoinProvider.address)
        })

        it('should WETH price', async function () {
          const {_priceInUsd} = await priceProvider['getPriceInUsd(address)'](WETH_ADDRESS)
          expect(_priceInUsd).closeTo(parseEther('3,230'), parseEther('1'))
        })

        it('should WBTC price', async function () {
          const {_priceInUsd} = await priceProvider['getPriceInUsd(address)'](WBTC_ADDRESS)
          expect(_priceInUsd).closeTo(parseEther('43,711'), parseEther('1'))
        })

        it('should DAI price', async function () {
          const {_priceInUsd} = await priceProvider['getPriceInUsd(address)'](USDC_ADDRESS)
          expect(_priceInUsd).closeTo(parseEther('1'), parseEther('0.1'))
        })
      })
    })
  })

  describe('UniswapV3PriceProvider @arbitrum', function () {
    const {USDC_ADDRESS, WETH_ADDRESS, WBTC_ADDRESS} = Address.arbitrum

    beforeEach(async function () {
      usdc = IERC20__factory.connect(USDC_ADDRESS, deployer)
      weth = IERC20__factory.connect(WETH_ADDRESS, deployer)
      wbtc = IERC20__factory.connect(WBTC_ADDRESS, deployer)

      const crossPoolOracleFactory = new UniswapV3CrossPoolOracle__factory(deployer)
      const crossPoolOracle = await crossPoolOracleFactory.deploy(weth.address)
      await crossPoolOracle.deployed()

      const priceProviderFactory = new UniswapV3PriceProvider__factory(deployer)
      priceProvider = await priceProviderFactory.deploy(crossPoolOracle.address, DEFAULT_TWAP_PERIOD, DEFAULT_POOLS_FEE)
      await priceProvider.deployed()
    })

    describe('quote', function () {
      it('should quote same token to same token', async function () {
        const amountIn = parseEther('100')
        const {_amountOut} = await priceProvider['quote(address,address,uint256)'](weth.address, weth.address, amountIn)
        expect(_amountOut).eq(amountIn)
      })

      it('should quote using NATIVE-USDC path', async function () {
        const {_amountOut} = await priceProvider['quote(address,address,uint256)'](
          weth.address,
          usdc.address,
          parseEther('1')
        )
        expect(_amountOut).closeTo(parseUnits('3,005', 6), parseUnits('1', 6))
      })

      it('should quote using WBTC-NATIVE-USDC', async function () {
        const {_amountOut} = await priceProvider['quote(address,address,uint256)'](
          wbtc.address,
          usdc.address,
          parseUnits('1', 8)
        )
        expect(_amountOut).closeTo(parseUnits('40,646', 6), parseUnits('1', 6))
      })
    })
  })

  describe('UniswapV3PriceProvider @polygon', function () {
    const {USDC_ADDRESS, WETH_ADDRESS, WBTC_ADDRESS} = Address.polygon

    beforeEach(async function () {
      usdc = IERC20__factory.connect(USDC_ADDRESS, deployer)
      // WETH has more liquid pools than WMATIC
      weth = IERC20__factory.connect(WETH_ADDRESS, deployer)
      wbtc = IERC20__factory.connect(WBTC_ADDRESS, deployer)

      const crossPoolOracleFactory = new UniswapV3CrossPoolOracle__factory(deployer)
      const crossPoolOracle = await crossPoolOracleFactory.deploy(weth.address)
      await crossPoolOracle.deployed()

      const priceProviderFactory = new UniswapV3PriceProvider__factory(deployer)
      priceProvider = await priceProviderFactory.deploy(crossPoolOracle.address, DEFAULT_TWAP_PERIOD, DEFAULT_POOLS_FEE)
      await priceProvider.deployed()
    })

    describe('quote', function () {
      it('should quote same token to same token', async function () {
        const amountIn = parseEther('100')
        const {_amountOut} = await priceProvider['quote(address,address,uint256)'](weth.address, weth.address, amountIn)
        expect(_amountOut).eq(amountIn)
      })

      it('should quote using WETH-USDC path', async function () {
        const {_amountOut} = await priceProvider['quote(address,address,uint256)'](
          weth.address,
          usdc.address,
          parseEther('1')
        )
        expect(_amountOut).closeTo(parseUnits('3,006', 6), parseUnits('1', 6))
      })

      it('should quote using WBTC-WETH-USDC', async function () {
        const {_amountOut} = await priceProvider['quote(address,address,uint256)'](
          wbtc.address,
          usdc.address,
          parseUnits('1', 8)
        )
        expect(_amountOut).closeTo(parseUnits('40,597', 6), parseUnits('1', 6))
      })
    })
  })
})
