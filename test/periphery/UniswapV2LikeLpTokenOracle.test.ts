/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {
  UniswapV2LikeLpTokenOracle,
  UniswapV2LikeLpTokenOracle__factory,
  ChainlinkMainnetPriceProvider__factory,
  ChainlinkMainnetPriceProvider,
  IUniswapV2Pair,
  IUniswapV2Pair__factory,
  IERC20,
  IERC20__factory,
  IUniswapV2Router02__factory,
  IUniswapV2Router02,
} from '../../typechain-types'
import Address from '../../helpers/address'
import {impersonateAccount, parseEther, parseUnits} from '../helpers'
import Quote from '../helpers/quotes'

const UNISWAP_V2_WETH_DAI_PAIR = '0xA478c2975Ab1Ea89e8196811F51A7B7Ade33eB11'
const UNISWAP_V2_WETH_DAI_LIQUIDITY_PROVIDER = '0x79317fc0fb17bc0ce213a2b50f343e4d4c277704'
const UNISWAP_V2_WETH_WBTC_PAIR = '0xBb2b8038a1640196FbE3e38816F3e67Cba72D940'
const UNISWAP_V2_WBTC_USDC_PAIR = '0x004375dff511095cc5a197a54140a24efef3a416'
const DAI_HOLDER = '0x075e72a5eDf65F0A5f44699c7654C1a76941Ddc8'

const {UNISWAP_V2_ROUTER_ADDRESS, WETH, DAI, WBTC, USDC} = Address.mainnet

describe('UniswapV2LikeLpTokenOracle @mainnet', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let underlyingOracle: ChainlinkMainnetPriceProvider
  let lpOracle: UniswapV2LikeLpTokenOracle
  let router: IUniswapV2Router02
  let ethDaiPair: IUniswapV2Pair
  let ethWbtcPair: IUniswapV2Pair
  let wbtcUsdcPair: IUniswapV2Pair
  let weth: IERC20
  let dai: IERC20
  let wbtc: IERC20
  let usdc: IERC20

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer] = await ethers.getSigners()

    const chainlinkProviderFactory = new ChainlinkMainnetPriceProvider__factory(deployer)
    underlyingOracle = await chainlinkProviderFactory.deploy()
    await underlyingOracle.deployed()

    const lpOracleFactory = new UniswapV2LikeLpTokenOracle__factory(deployer)
    lpOracle = await lpOracleFactory.deploy(underlyingOracle.address)
    await lpOracle.deployed()

    router = IUniswapV2Router02__factory.connect(UNISWAP_V2_ROUTER_ADDRESS, deployer)
    ethDaiPair = IUniswapV2Pair__factory.connect(UNISWAP_V2_WETH_DAI_PAIR, deployer)
    ethWbtcPair = IUniswapV2Pair__factory.connect(UNISWAP_V2_WETH_WBTC_PAIR, deployer)
    wbtcUsdcPair = IUniswapV2Pair__factory.connect(UNISWAP_V2_WBTC_USDC_PAIR, deployer)
    weth = IERC20__factory.connect(WETH, deployer)
    dai = IERC20__factory.connect(DAI, deployer)
    wbtc = IERC20__factory.connect(WBTC, deployer)
    usdc = IERC20__factory.connect(USDC, deployer)
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('getPriceInUsd', function () {
    describe('should get accurate LP token price', function () {
      it('when both tokens are 18-decimals (weth,dai)', async function () {
        // given
        const ethReserves = await weth.balanceOf(ethDaiPair.address)
        const daiReserves = await dai.balanceOf(ethDaiPair.address)
        const [ethPriceInUsd] = await underlyingOracle.getPriceInUsd(weth.address)
        const [daiPriceInUsd] = await underlyingOracle.getPriceInUsd(dai.address)
        const ethReservesInUsd = ethReserves.mul(ethPriceInUsd).div(parseEther('1'))
        const daiReservesInUsd = daiReserves.mul(daiPriceInUsd).div(parseEther('1'))
        const allReservesInUsd = ethReservesInUsd.add(daiReservesInUsd)
        const expectedPriceInUsd = allReservesInUsd.mul(parseEther('1')).div(await ethDaiPair.totalSupply())

        // when
        const priceInUsd = await lpOracle.getPriceInUsd(ethDaiPair.address)

        // then
        expect(priceInUsd).closeTo(Quote.mainnet.UNIV2_ETH_DAI_LP_USD, parseEther('1'))
        expect(priceInUsd).closeTo(expectedPriceInUsd, parseEther('0.001'))
      })

      it('when just one token is 18-decimals (weth,wbtc)', async function () {
        // given
        const ethReserves = await weth.balanceOf(ethWbtcPair.address)
        const wbtcReserves = await wbtc.balanceOf(ethWbtcPair.address)
        const [ethPriceInUsd] = await underlyingOracle.getPriceInUsd(weth.address)
        const [btcPriceInUsd] = await underlyingOracle.getPriceInUsd(wbtc.address)
        const ethReservesInUsd = ethReserves.mul(ethPriceInUsd).div(parseEther('1'))
        const wbtcReservesInUsd = wbtcReserves.mul(btcPriceInUsd).div(parseUnits('1', 8))
        const allReservesInUsd = ethReservesInUsd.add(wbtcReservesInUsd)
        const expectedPriceInUsd = allReservesInUsd.mul(parseEther('1')).div(await ethWbtcPair.totalSupply())

        // when
        const priceInUsd = await lpOracle.getPriceInUsd(ethWbtcPair.address)

        // then
        expect(priceInUsd).closeTo(Quote.mainnet.UNIV2_ETH_WBTC_LP_USD, parseEther('1'))
        expect(priceInUsd).closeTo(expectedPriceInUsd, parseEther('2,000'))
      })

      it('when none of tokens are 18-decimals (wbtc,usdc)', async function () {
        // given
        const wbtcReserves = await wbtc.balanceOf(wbtcUsdcPair.address)
        const usdcReserves = await usdc.balanceOf(wbtcUsdcPair.address)
        const [btcPriceInUsd] = await underlyingOracle.getPriceInUsd(wbtc.address)
        const [usdcPriceInUsd] = await underlyingOracle.getPriceInUsd(usdc.address)
        const wbtcReservesInUsd = wbtcReserves.mul(btcPriceInUsd).div(parseUnits('1', 8))
        const usdcReservesInUsd = usdcReserves.mul(usdcPriceInUsd).div(parseUnits('1', 6))
        const allReservesInUsd = wbtcReservesInUsd.add(usdcReservesInUsd)
        const expectedPriceInUsd = allReservesInUsd.mul(parseEther('1')).div(await wbtcUsdcPair.totalSupply())

        // when
        const priceInUsd = await lpOracle.getPriceInUsd(wbtcUsdcPair.address)

        // then
        expect(priceInUsd).closeTo(Quote.mainnet.UNIV2_WBTC_USDC_LP_USD, parseEther('1'))
        expect(priceInUsd).closeTo(expectedPriceInUsd, parseEther('125,000,000'))
      })

      it('after liquidity removal', async function () {
        // given
        const priceBefore = await lpOracle.getPriceInUsd(ethDaiPair.address)
        const provider = await impersonateAccount(UNISWAP_V2_WETH_DAI_LIQUIDITY_PROVIDER)
        const lpBalanceOfProvider = await ethDaiPair.balanceOf(provider.address)
        const lpSupplyBefore = await ethDaiPair.totalSupply()
        const lpShareOfProvider = lpBalanceOfProvider.mul(parseEther('1')).div(lpSupplyBefore)
        expect(lpShareOfProvider).closeTo(parseEther('0.11'), parseEther('0.01')) // ~11% of all liquidity

        // when
        await ethDaiPair.connect(provider).approve(router.address, lpBalanceOfProvider)
        await router.connect(provider).removeLiquidityETH(
          dai.address, // token
          lpBalanceOfProvider, // liquidity
          0, // amountTokenMin
          0, // amountETHMin
          provider.address, // to
          ethers.constants.MaxUint256 // deadline
        )

        // then
        const lpSupplyAfter = await ethDaiPair.totalSupply()
        expect(lpSupplyAfter).lt(lpSupplyBefore)
        const priceAfter = await lpOracle.getPriceInUsd(ethDaiPair.address)
        expect(priceAfter).eq(priceBefore)
      })

      it('after huge swap', async function () {
        // given
        const priceBefore = await lpOracle.getPriceInUsd(ethDaiPair.address)
        const provider = await impersonateAccount(UNISWAP_V2_WETH_DAI_LIQUIDITY_PROVIDER)
        const ethReservesBefore = await weth.balanceOf(ethDaiPair.address)
        const ethToSell = ethReservesBefore.div(2) // 50%

        // when
        await router.connect(provider).swapExactETHForTokens(
          0, // amountOutMin
          [weth.address, dai.address], // path
          provider.address, // to
          ethers.constants.MaxUint256, // deadline
          {value: ethToSell}
        )

        // then
        const ethReservesAfter = await weth.balanceOf(ethDaiPair.address)
        expect(ethReservesAfter).gt(ethReservesBefore)
        const priceAfter = await lpOracle.getPriceInUsd(ethDaiPair.address)
        expect(priceAfter).closeTo(priceBefore, parseEther('0.1'))
      })

      it('after unbalanced liquidity addition', async function () {
        // given
        const priceBefore = await lpOracle.getPriceInUsd(ethDaiPair.address)
        const provider = await impersonateAccount(DAI_HOLDER)
        const daiBalanceOfProvider = await dai.balanceOf(provider.address)
        const daiBalanceOfPair = await dai.balanceOf(ethDaiPair.address)
        expect(daiBalanceOfProvider).gt(daiBalanceOfPair)
        const [ethPriceInUsd] = await underlyingOracle.getPriceInUsd(weth.address)
        expect(ethPriceInUsd).closeTo(Quote.mainnet.ETH_USD, parseEther('5'))

        // when
        const daiToAdd = daiBalanceOfPair // ~$13.5M
        const ethToAdd = parseEther('1') // ~$3.2K
        await dai.connect(provider).approve(router.address, daiBalanceOfPair)
        await router.connect(provider).addLiquidityETH(
          dai.address, // token
          daiToAdd, // amountTokenDesired
          0, // amountTokenMin
          0, // amountETHMin
          provider.address, // to
          ethers.constants.MaxUint256, // deadline
          {value: ethToAdd}
        )
        expect(await dai.balanceOf(ethDaiPair.address)).gt(daiBalanceOfPair)

        // then
        const priceAfter = await lpOracle.getPriceInUsd(ethDaiPair.address)
        expect(priceAfter).eq(priceBefore)
      })
    })
  })
})
