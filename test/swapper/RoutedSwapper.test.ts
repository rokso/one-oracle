/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {
  UniswapV2LikeExchange,
  UniswapV2LikeExchange__factory,
  UniswapV3Exchange,
  UniswapV3Exchange__factory,
  CurveExchange,
  CurveExchange__factory,
  RoutedSwapper,
  RoutedSwapper__factory,
  IERC20,
  IERC20__factory,
} from '../../typechain-types'
import {parseEther, parseUnits} from '../helpers'
import {Address, ExchangeType, SwapType, InitCodeHash} from '../../helpers'
import {adjustBalance} from '../helpers/balance'
import {smock} from '@defi-wonderland/smock'
import {CurveSwapRoute, CurveSwapParams} from '../helpers/curve-exchange'

const {AddressZero} = ethers.constants

const abi = ethers.utils.defaultAbiCoder

const {WETH, DAI, WBTC, STETH, UNISWAP_V2_FACTORY_ADDRESS, Curve, USDC, USDT, STG, FRAX, ETH, CVX, CRV, RETH, MUSD} =
  Address.mainnet
const UNISWAP_INIT_CODE_HASH = InitCodeHash[UNISWAP_V2_FACTORY_ADDRESS]

describe('RoutedSwapper @mainnet', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let user: SignerWithAddress
  let invalidToken: SignerWithAddress
  let uniswapV2Exchange: UniswapV2LikeExchange
  let uniswapV3Exchange: UniswapV3Exchange
  let curveExchange: CurveExchange
  let swapper: RoutedSwapper
  let weth: IERC20
  let dai: IERC20
  let wbtc: IERC20
  let steth: IERC20
  let usdc: IERC20
  let usdt: IERC20
  let stg: IERC20
  let frax: IERC20
  let musd: IERC20
  let cvx: IERC20
  let crv: IERC20
  let reth: IERC20

  beforeEach(async function () {
    // Essentially we are making sure we execute setup once only
    // Check whether we ever created snapshot before.
    if (snapshotId) {
      // Recreate snapshot and return.
      snapshotId = await ethers.provider.send('evm_snapshot', [])
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-extra-semi
    ;[deployer, user, invalidToken] = await ethers.getSigners()

    const addressProvider = await smock.fake('AddressProvider', {address: Address.ADDRESS_PROVIDER})
    addressProvider.governor.returns(deployer.address)

    const uniswapV2LikeExchangeFactory = new UniswapV2LikeExchange__factory(deployer)

    uniswapV2Exchange = await uniswapV2LikeExchangeFactory.deploy(
      UNISWAP_V2_FACTORY_ADDRESS,
      UNISWAP_INIT_CODE_HASH,
      WETH
    )
    await uniswapV2Exchange.deployed()

    const uniswapV3ExchangeFactory = new UniswapV3Exchange__factory(deployer)
    uniswapV3Exchange = await uniswapV3ExchangeFactory.deploy(WETH)
    await uniswapV3Exchange.deployed()

    const curveExchangeFactory = new CurveExchange__factory(deployer)
    curveExchange = await curveExchangeFactory.deploy(Curve.ADDRESS_PROVIDER)
    await curveExchange.deployed()

    const swapperFactory = new RoutedSwapper__factory(deployer)
    swapper = await swapperFactory.deploy()
    await swapper.deployed()

    await swapper.setExchange(ExchangeType.UNISWAP_V2, uniswapV2Exchange.address)
    await swapper.setExchange(ExchangeType.UNISWAP_V3, uniswapV3Exchange.address)
    await swapper.setExchange(ExchangeType.CURVE, curveExchange.address)

    weth = IERC20__factory.connect(WETH, deployer)
    dai = IERC20__factory.connect(DAI, deployer)
    wbtc = IERC20__factory.connect(WBTC, deployer)
    steth = IERC20__factory.connect(STETH, deployer)
    usdc = IERC20__factory.connect(USDC, deployer)
    usdt = IERC20__factory.connect(USDT, deployer)
    stg = IERC20__factory.connect(STG, deployer)
    frax = IERC20__factory.connect(FRAX, deployer)
    cvx = IERC20__factory.connect(CVX, deployer)
    crv = IERC20__factory.connect(CRV, deployer)
    musd = IERC20__factory.connect(MUSD, deployer)
    reth = IERC20__factory.connect(RETH, deployer)

    await adjustBalance(weth.address, deployer.address, parseEther('1,000,000'))
    await adjustBalance(dai.address, deployer.address, parseEther('1,000,000'))
    await adjustBalance(wbtc.address, deployer.address, parseUnits('1,000,000', 8))
    await adjustBalance(steth.address, deployer.address, parseEther('1,000'))
    await adjustBalance(usdc.address, deployer.address, parseUnits('1,000', 6))
    await adjustBalance(stg.address, deployer.address, parseUnits('1,000', 18))
    await adjustBalance(frax.address, deployer.address, parseUnits('1,000', 18))
    await adjustBalance(cvx.address, deployer.address, parseUnits('1,000', 18))
    await adjustBalance(crv.address, deployer.address, parseUnits('1,000', 18))
    await adjustBalance(musd.address, deployer.address, parseUnits('1,000', 18))

    const uniswapV3defaultPath = ethers.utils.solidityPack(
      ['address', 'uint24', 'address'],
      [WETH, await uniswapV3Exchange.defaultPoolFee(), WBTC]
    )
    await swapper.setDefaultRouting(SwapType.EXACT_INPUT, WETH, WBTC, ExchangeType.UNISWAP_V3, uniswapV3defaultPath)

    await swapper.setDefaultRouting(SwapType.EXACT_OUTPUT, WBTC, WETH, ExchangeType.UNISWAP_V3, uniswapV3defaultPath)

    await swapper.setDefaultRouting(
      SwapType.EXACT_INPUT,
      WETH,
      DAI,
      ExchangeType.UNISWAP_V2,
      abi.encode(['address[]'], [[WETH, DAI]])
    )

    await swapper.setDefaultRouting(
      SwapType.EXACT_INPUT,
      STETH,
      DAI,
      ExchangeType.UNISWAP_V2,
      abi.encode(['address[]'], [[STETH, WETH, DAI]])
    )

    await swapper.setDefaultRouting(
      SwapType.EXACT_OUTPUT,
      STETH,
      DAI,
      ExchangeType.UNISWAP_V2,
      abi.encode(['address[]'], [[STETH, WETH, DAI]])
    )

    await swapper.setDefaultRouting(
      SwapType.EXACT_OUTPUT,
      DAI,
      WETH,
      ExchangeType.UNISWAP_V2,
      abi.encode(['address[]'], [[DAI, WETH]])
    )

    const route: CurveSwapRoute = [
      USDC,
      Curve.TRIPOOL_POOL,
      USDT,
      AddressZero,
      AddressZero,
      AddressZero,
      AddressZero,
      AddressZero,
      AddressZero,
    ]

    const params: CurveSwapParams = [
      [1, 2, 1],
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ]

    await swapper.setDefaultRouting(
      SwapType.EXACT_INPUT,
      USDC,
      USDT,
      ExchangeType.CURVE,
      abi.encode(['address[9]', 'uint256[3][4]'], [route, params])
    )

    // Take snapshot of setup
    snapshotId = await ethers.provider.send('evm_snapshot', [])
  })

  afterEach(async function () {
    // Revert to snapshot point
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('getAmountIn', function () {
    it('should revert if swap is impossible', async function () {
      const amountOut = parseEther('1,000')
      const call = swapper.getAmountIn(WETH, invalidToken.address, amountOut)
      await expect(call).revertedWith('no-routing-found')
    })

    it('should get best amountIn for WETH->DAI', async function () {
      // given
      const path = abi.encode(['address[]'], [[DAI, WETH]])
      const amountOut = parseEther('3,222')
      const exchangeAmountIn = await uniswapV2Exchange.callStatic['getAmountsIn(uint256,bytes)'](amountOut, path)

      // when
      const swapperAmountIn = await swapper.callStatic.getAmountIn(DAI, WETH, amountOut)

      // then
      expect(swapperAmountIn).eq(exchangeAmountIn)
    })
  })

  describe('getAmountOut', function () {
    it('should revert if swap is impossible', async function () {
      const amountIn = parseEther('1,000')
      const call = swapper.getAmountOut(WETH, invalidToken.address, amountIn)
      await expect(call).revertedWith('no-routing-found')
    })

    it('should get best amountOut for WETH->WBTC', async function () {
      // given
      const amountIn = parseEther('1')
      const path = ethers.utils.solidityPack(
        ['address', 'uint24', 'address'],
        [WETH, await uniswapV3Exchange.defaultPoolFee(), WBTC]
      )
      const exchangeAmountOut = await uniswapV3Exchange.callStatic.getAmountsOut(amountIn, path)

      // when
      const swapperAmountOut = await swapper.callStatic.getAmountOut(WETH, WBTC, amountIn)

      // then
      expect(swapperAmountOut).eq(exchangeAmountOut)
    })
  })

  describe('swapExactInput', function () {
    it('should perform an exact input swap WETH->DAI', async function () {
      // given
      const amountIn = parseEther('1')
      const amountOut = await swapper.callStatic.getAmountOut(WETH, DAI, amountIn)
      const wethBefore = await weth.balanceOf(deployer.address)
      const daiBefore = await dai.balanceOf(deployer.address)

      // when
      await weth.approve(swapper.address, amountIn)
      await swapper.swapExactInput(WETH, DAI, amountIn, amountIn, deployer.address)

      // then
      const wethAfter = await weth.balanceOf(deployer.address)
      const daiAfter = await dai.balanceOf(deployer.address)
      expect(wethAfter).eq(wethBefore.sub(amountIn))
      expect(daiAfter).eq(daiBefore.add(amountOut))
    })

    it('should swap STETH->DAI', async function () {
      // given
      const amountIn = '61361333631158094'
      const stethBefore = await steth.balanceOf(deployer.address)
      const daiBefore = await dai.balanceOf(deployer.address)

      // when
      await steth.approve(swapper.address, amountIn)
      // Check output of swap using callStatic
      const amountOut = await swapper.callStatic.swapExactInput(STETH, DAI, amountIn, '1', deployer.address)
      await swapper.swapExactInput(STETH, DAI, amountIn, '1', deployer.address)

      // then
      const stethAfter = await steth.balanceOf(deployer.address)
      const daiAfter = await dai.balanceOf(deployer.address)
      // stETH will transfer 1 wei less, meaning there is 1 more wei after the swap
      expect(stethAfter).closeTo(stethBefore.sub(amountIn), 1)
      expect(daiAfter).eq(daiBefore.add(amountOut))
    })

    it('should swap FRAX->USDC->WETH', async function () {
      const uniswapV3Path = ethers.utils.solidityPack(
        ['address', 'uint24', 'address', 'uint24', 'address'],
        [FRAX, 100, USDC, 500, WETH]
      )

      await swapper.setDefaultRouting(SwapType.EXACT_INPUT, FRAX, WETH, ExchangeType.UNISWAP_V3, uniswapV3Path)

      // given
      const amountIn = '1000000000000000000000'
      const fraxBefore = await frax.balanceOf(deployer.address)
      const wethBefore = await weth.balanceOf(deployer.address)

      // when
      await frax.approve(swapper.address, amountIn)
      // Check output of swap using callStatic
      const amountOut = await swapper.callStatic.swapExactInput(FRAX, WETH, amountIn, '1', deployer.address)
      await swapper.swapExactInput(FRAX, WETH, amountIn, '1', deployer.address)

      // then
      const fraxAfter = await frax.balanceOf(deployer.address)
      const wethAfter = await weth.balanceOf(deployer.address)

      expect(fraxAfter).closeTo(fraxBefore.sub(amountIn), 1)
      expect(wethAfter).eq(wethBefore.add(amountOut))
    })

    it('should swap WETH->USDC->FRAX', async function () {
      const uniswapV3Path = ethers.utils.solidityPack(
        ['address', 'uint24', 'address', 'uint24', 'address'],
        [WETH, 500, USDC, 100, FRAX]
      )

      await swapper.setDefaultRouting(SwapType.EXACT_INPUT, WETH, FRAX, ExchangeType.UNISWAP_V3, uniswapV3Path)

      // given
      const amountIn = '10000000000000000000'
      const fraxBefore = await frax.balanceOf(deployer.address)
      const wethBefore = await weth.balanceOf(deployer.address)

      // when
      await weth.approve(swapper.address, amountIn)
      // Check output of swap using callStatic
      const amountOut = await swapper.callStatic.swapExactInput(WETH, FRAX, amountIn, '1', deployer.address)
      await swapper.swapExactInput(WETH, FRAX, amountIn, '1', deployer.address)

      // then
      const fraxAfter = await frax.balanceOf(deployer.address)
      const wethAfter = await weth.balanceOf(deployer.address)

      expect(wethAfter).closeTo(wethBefore.sub(amountIn), 1)
      expect(fraxAfter).eq(fraxBefore.add(amountOut))
    })

    it('should swap USDC->USDT', async function () {
      // given
      const amountIn = parseUnits('100', 6)
      const usdcBefore = await usdc.balanceOf(deployer.address)
      const usdtBefore = await usdt.balanceOf(deployer.address)

      // when
      await usdc.approve(swapper.address, amountIn)
      // Check output of swap using callStatic
      const amountOut = await swapper.callStatic.swapExactInput(USDC, USDT, amountIn, '1', deployer.address)
      await swapper.swapExactInput(USDC, USDT, amountIn, '1', deployer.address)

      // then
      const usdcAfter = await usdc.balanceOf(deployer.address)
      const usdtAfter = await usdt.balanceOf(deployer.address)
      expect(usdcAfter).eq(usdcBefore.sub(amountIn))
      expect(usdtAfter).eq(usdtBefore.add(amountOut))
    })

    it('should swap STG->USDC', async function () {
      // add default route
      const routeStg2Usdc: CurveSwapRoute = [
        STG,
        Curve.STG_USDC_POOL,
        USDC,
        AddressZero,
        AddressZero,
        AddressZero,
        AddressZero,
        AddressZero,
        AddressZero,
      ]

      const paramsStg2Usdc: CurveSwapParams = [
        [0, 1, 4],
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
      ]

      await swapper.setDefaultRouting(
        SwapType.EXACT_INPUT,
        STG,
        USDC,
        ExchangeType.CURVE,
        abi.encode(['address[9]', 'uint256[3][4]'], [routeStg2Usdc, paramsStg2Usdc])
      )

      // given
      const amountIn = parseUnits('100', 18)
      const stgBefore = await stg.balanceOf(deployer.address)
      const usdcBefore = await usdc.balanceOf(deployer.address)

      // when
      await stg.approve(swapper.address, amountIn)
      // Check output of swap using callStatic
      const amountOut = await swapper.callStatic.swapExactInput(STG, USDC, amountIn, '1', deployer.address)
      await swapper.swapExactInput(STG, USDC, amountIn, '1', deployer.address)

      // then
      const stgAfter = await stg.balanceOf(deployer.address)
      const usdcAfter = await usdc.balanceOf(deployer.address)
      expect(stgAfter).eq(stgBefore.sub(amountIn))
      expect(usdcAfter).eq(usdcBefore.add(amountOut))
    })

    it('should swap STG->DAI', async function () {
      // add default route
      const routeStg2Dai: CurveSwapRoute = [
        STG,
        Curve.STG_USDC_POOL,
        USDC,
        Curve.TRIPOOL_POOL,
        DAI,
        AddressZero,
        AddressZero,
        AddressZero,
        AddressZero,
      ]

      const paramsStg2Dai: CurveSwapParams = [
        [0, 1, 4],
        [1, 0, 1],
        [0, 0, 0],
        [0, 0, 0],
      ]

      await swapper.setDefaultRouting(
        SwapType.EXACT_INPUT,
        STG,
        DAI,
        ExchangeType.CURVE,
        abi.encode(['address[9]', 'uint256[3][4]'], [routeStg2Dai, paramsStg2Dai])
      )

      // given
      const amountIn = parseUnits('100', 18)
      const stgBefore = await stg.balanceOf(deployer.address)
      const daiBefore = await dai.balanceOf(deployer.address)

      // when
      await stg.approve(swapper.address, amountIn)
      // Check output of swap using callStatic
      const amountOut = await swapper.callStatic.swapExactInput(STG, DAI, amountIn, '1', deployer.address)
      const tx = await swapper.swapExactInput(STG, DAI, amountIn, '1', deployer.address)
      expect((await tx.wait()).gasUsed).lt(600000)

      // then
      const stgAfter = await stg.balanceOf(deployer.address)
      const daiAfter = await dai.balanceOf(deployer.address)
      expect(stgAfter).eq(stgBefore.sub(amountIn))
      expect(daiAfter).eq(daiBefore.add(amountOut))
    })

    it('should swap CVX->FRAX using CurveExchange', async function () {
      // add default route
      const routeCvx2Frax: CurveSwapRoute = [
        CVX,
        Curve.CVX_ETH_POOL,
        ETH,
        Curve.ETH_USDT_POOL,
        USDT,
        Curve.FRAX_3CRV_LP,
        FRAX,
        AddressZero,
        AddressZero,
      ]

      const paramsCvx2Frax: CurveSwapParams = [
        [1, 0, 3],
        [2, 0, 3],
        [3, 0, 2],
        [0, 0, 0],
      ]

      await swapper.setDefaultRouting(
        SwapType.EXACT_INPUT,
        CVX,
        FRAX,
        ExchangeType.CURVE,
        abi.encode(['address[9]', 'uint256[3][4]'], [routeCvx2Frax, paramsCvx2Frax])
      )

      // given
      const amountIn = parseUnits('100', 18)
      const cvxBefore = await cvx.balanceOf(deployer.address)
      const fraxBefore = await frax.balanceOf(deployer.address)

      // when
      await cvx.approve(swapper.address, amountIn)
      // Check output of swap using callStatic
      const amountOut = await swapper.callStatic.swapExactInput(CVX, FRAX, amountIn, '1', deployer.address)
      await swapper.swapExactInput(CVX, FRAX, amountIn, '1', deployer.address)

      // then
      const cvxAfter = await cvx.balanceOf(deployer.address)
      const fraxAfter = await frax.balanceOf(deployer.address)
      expect(cvxAfter).eq(cvxBefore.sub(amountIn))
      expect(fraxAfter).eq(fraxBefore.add(amountOut))
    })

    it('should swap CRV->FRAX using UniV3', async function () {
      const tokenIn = CRV
      const tokenOut = FRAX
      const uniswapV3Path = ethers.utils.solidityPack(
        ['address', 'uint24', 'address', 'uint24', 'address', 'uint24', 'address'],
        [tokenIn, 3000, WETH, 500, USDC, 100, tokenOut]
      )
      await swapper.setDefaultRouting(SwapType.EXACT_INPUT, tokenIn, tokenOut, ExchangeType.UNISWAP_V3, uniswapV3Path)

      // given
      const amountIn = parseUnits('100', 18)
      const crvBefore = await crv.balanceOf(deployer.address)
      const fraxBefore = await frax.balanceOf(deployer.address)
      // when
      await crv.approve(swapper.address, amountIn)
      // Check output of swap using callStatic
      const amountOut = await swapper.callStatic.swapExactInput(tokenIn, tokenOut, amountIn, '1', deployer.address)
      const tx = await swapper.swapExactInput(tokenIn, tokenOut, amountIn, '1', deployer.address)
      expect((await tx.wait()).gasUsed).lt(330000)

      // then
      const crvAfter = await crv.balanceOf(deployer.address)
      const fraxAfter = await frax.balanceOf(deployer.address)
      expect(crvAfter).eq(crvBefore.sub(amountIn))
      expect(fraxAfter).eq(fraxBefore.add(amountOut))
    })

    it('should swap CVX->FRAX using UniV3', async function () {
      const tokenIn = CVX
      const tokenOut = FRAX
      const uniswapV3Path = ethers.utils.solidityPack(
        ['address', 'uint24', 'address', 'uint24', 'address', 'uint24', 'address'],
        [tokenIn, 10000, WETH, 500, USDC, 100, tokenOut]
      )
      await swapper.setDefaultRouting(SwapType.EXACT_INPUT, tokenIn, tokenOut, ExchangeType.UNISWAP_V3, uniswapV3Path)

      // given
      const amountIn = parseUnits('100', 18)
      const cvxBefore = await cvx.balanceOf(deployer.address)
      const fraxBefore = await frax.balanceOf(deployer.address)
      // when
      await cvx.approve(swapper.address, amountIn)
      // Check output of swap using callStatic
      const amountOut = await swapper.callStatic.swapExactInput(tokenIn, tokenOut, amountIn, '1', deployer.address)
      const tx = await swapper.swapExactInput(tokenIn, tokenOut, amountIn, '1', deployer.address)
      expect((await tx.wait()).gasUsed).lt(331000)

      // then
      const cvxAfter = await cvx.balanceOf(deployer.address)
      const fraxAfter = await frax.balanceOf(deployer.address)
      expect(cvxAfter).eq(cvxBefore.sub(amountIn))
      expect(fraxAfter).eq(fraxBefore.add(amountOut))
    })

    it('should swap CRV->MUSD using CurveExchange', async function () {
      const tokenIn = CRV
      const tokenOut = MUSD
      const routeCrv2MUSD: CurveSwapRoute = [
        CRV,
        Curve.CRV_ETH_POOL,
        ETH,
        Curve.ETH_USDT_POOL,
        USDT,
        Curve.MUSD_POOL,
        tokenOut,
        AddressZero,
        AddressZero,
      ]
      const paramsCrv2musd: CurveSwapParams = [
        [1, 0, 3],
        [2, 0, 3],
        [3, 0, 2],
        [0, 0, 0],
      ]

      await swapper.setDefaultRouting(
        SwapType.EXACT_INPUT,
        tokenIn,
        tokenOut,
        ExchangeType.CURVE,
        abi.encode(['address[9]', 'uint256[3][4]'], [routeCrv2MUSD, paramsCrv2musd])
      )

      // given
      const amountIn = parseUnits('1000', 18)
      const crvBefore = await crv.balanceOf(deployer.address)
      const musdBefore = await musd.balanceOf(deployer.address)

      // when
      await crv.approve(swapper.address, amountIn)
      // Check output of swap using callStatic
      const amountOut = await swapper.callStatic.swapExactInput(tokenIn, tokenOut, amountIn, '1', deployer.address)
      const tx = await swapper.swapExactInput(tokenIn, tokenOut, amountIn, '1', deployer.address)
      expect((await tx.wait()).gasUsed).lt(920000)

      // then
      const crvAfter = await crv.balanceOf(deployer.address)
      const musdAfter = await musd.balanceOf(deployer.address)
      expect(crvAfter).eq(crvBefore.sub(amountIn))
      expect(musdAfter).eq(musdBefore.add(amountOut))
    })

    it('should swap CVX->MUSD using CurveExchange', async function () {
      const tokenIn = CVX
      const tokenOut = MUSD
      const routeCvx2Musd: CurveSwapRoute = [
        tokenIn,
        Curve.CVX_ETH_POOL,
        ETH,
        Curve.ETH_USDT_POOL,
        USDT,
        Curve.MUSD_POOL,
        tokenOut,
        AddressZero,
        AddressZero,
      ]

      const paramsCvx2Musd: CurveSwapParams = [
        [1, 0, 3],
        [2, 0, 3],
        [3, 0, 2],
        [0, 0, 0],
      ]

      await swapper.setDefaultRouting(
        SwapType.EXACT_INPUT,
        tokenIn,
        tokenOut,
        ExchangeType.CURVE,
        abi.encode(['address[9]', 'uint256[3][4]'], [routeCvx2Musd, paramsCvx2Musd])
      )

      // given
      const amountIn = parseUnits('100', 18)
      const cvxBefore = await cvx.balanceOf(deployer.address)
      const musdBefore = await musd.balanceOf(deployer.address)

      // when
      await cvx.approve(swapper.address, amountIn)
      // Check output of swap using callStatic
      const amountOut = await swapper.callStatic.swapExactInput(tokenIn, tokenOut, amountIn, '1', deployer.address)
      const tx = await swapper.swapExactInput(tokenIn, tokenOut, amountIn, '1', deployer.address)
      expect((await tx.wait()).gasUsed).lt(1020000)
      
      // then
      const cvxAfter = await cvx.balanceOf(deployer.address)
      const musdAfter = await musd.balanceOf(deployer.address)
      expect(cvxAfter).eq(cvxBefore.sub(amountIn))
      expect(musdAfter).eq(musdBefore.add(amountOut))
    })

    it('should swap DAI->rETH using UniV3', async function () {
      const tokenIn = DAI
      const tokenOut = RETH
      const uniswapV3Path = ethers.utils.solidityPack(
        ['address', 'uint24', 'address', 'uint24', 'address'],
        [tokenIn, 500, WETH, 500, tokenOut]
      )
      await swapper.setDefaultRouting(SwapType.EXACT_INPUT, tokenIn, tokenOut, ExchangeType.UNISWAP_V3, uniswapV3Path)

      // given
      const amountIn = parseUnits('100', 18)
      const daiBefore = await dai.balanceOf(deployer.address)
      const rethBefore = await reth.balanceOf(deployer.address)
      // when
      await dai.approve(swapper.address, amountIn)
      // Check output of swap using callStatic
      const amountOut = await swapper.callStatic.swapExactInput(tokenIn, tokenOut, amountIn, '1', deployer.address)
      const tx = await swapper.swapExactInput(tokenIn, tokenOut, amountIn, '1', deployer.address)
      expect((await tx.wait()).gasUsed).lt(270000)

      // then
      const daiAfter = await dai.balanceOf(deployer.address)
      const rethAfter = await reth.balanceOf(deployer.address)
      expect(daiAfter).eq(daiBefore.sub(amountIn))
      expect(rethAfter).eq(rethBefore.add(amountOut))
    })
  })

  describe('swapExactOutput', function () {
    it('should perform an exact output swap WBTC->WETH', async function () {
      // given
      const amountOut = parseEther('1')
      const amountIn = await swapper.callStatic.getAmountIn(WBTC, WETH, amountOut)
      const wethBefore = await weth.balanceOf(deployer.address)
      const wbtcBefore = await wbtc.balanceOf(deployer.address)

      // when
      await wbtc.approve(swapper.address, amountIn)
      await swapper.swapExactOutput(WBTC, WETH, amountOut, amountIn, deployer.address)

      // then
      const wethAfter = await weth.balanceOf(deployer.address)
      const wbtcAfter = await wbtc.balanceOf(deployer.address)
      expect(wethAfter).eq(wethBefore.add(amountOut))
      expect(wbtcAfter).eq(wbtcBefore.sub(amountIn))
    })

    // This test will at block 15128100 with 'UniswapV2: K' error, if we use old exchange code.
    it('should perform an exact output swap STETH->DAI', async function () {
      // given
      const amountOut = '63540089431808489926'
      const amountIn = await swapper.callStatic.getAmountIn(STETH, DAI, amountOut)

      const stethBefore = await steth.balanceOf(deployer.address)
      const daiBefore = await dai.balanceOf(deployer.address)

      // when
      await steth.approve(swapper.address, amountIn)
      await swapper.swapExactOutput(STETH, DAI, amountOut, amountIn, deployer.address)

      // then
      const stethAfter = await steth.balanceOf(deployer.address)
      const daiAfter = await dai.balanceOf(deployer.address)
      // stETH may transfer 1 wei less, meaning there may be 1 more wei after the swap
      expect(stethAfter).closeTo(stethBefore.sub(amountIn), '1')
      // Due to rebase/rounding, less stETH may be swapped so we may get less DAI than amount out
      expect(daiAfter).closeTo(daiBefore.add(amountOut), '5000')
    })
  })

  describe('setExchange', function () {
    it('should revert if not governor', async function () {
      const tx = swapper.connect(user).setExchange(ExchangeType.UNISWAP_V2, ethers.constants.AddressZero)
      await expect(tx).revertedWith('not-governor')
    })

    it('should add exchange', async function () {
      // given
      const before = await swapper.addressOf(ExchangeType.PANGOLIN)
      expect(before).eq(ethers.constants.AddressZero)
      const allExchangesBefore = await swapper.getAllExchanges()

      // when
      await swapper.setExchange(ExchangeType.PANGOLIN, user.address)

      // then
      const after = await swapper.addressOf(ExchangeType.PANGOLIN)
      expect(after).eq(user.address)
      const allExchangesAfter = await swapper.getAllExchanges()
      expect(allExchangesAfter.length).eq(allExchangesBefore.length + 1)
    })

    it('should update exchange', async function () {
      // given
      const before = await swapper.addressOf(ExchangeType.UNISWAP_V2)
      expect(before).eq(uniswapV2Exchange.address)
      const allExchangesBefore = await swapper.getAllExchanges()

      // when
      await swapper.setExchange(ExchangeType.UNISWAP_V2, user.address)

      // then
      const after = await swapper.addressOf(ExchangeType.UNISWAP_V2)
      expect(after).eq(user.address)
      const allExchangesAfter = await swapper.getAllExchanges()
      expect(allExchangesAfter.length).eq(allExchangesBefore.length)
    })

    it('should remove exchange', async function () {
      // given
      const before = await swapper.addressOf(ExchangeType.UNISWAP_V2)
      expect(before).eq(uniswapV2Exchange.address)
      const allExchangesBefore = await swapper.getAllExchanges()

      // when
      await swapper.setExchange(ExchangeType.UNISWAP_V2, ethers.constants.AddressZero)

      // then
      const after = await swapper.addressOf(ExchangeType.UNISWAP_V2)
      expect(after).eq(ethers.constants.AddressZero)
      const allExchangesAfter = await swapper.getAllExchanges()
      expect(allExchangesAfter.length).eq(allExchangesBefore.length - 1)
    })

    it('should revert when updating type for the same address', async function () {
      // given
      const before = await swapper.addressOf(ExchangeType.UNISWAP_V2)
      expect(before).eq(uniswapV2Exchange.address)

      // when
      const tx = swapper.setExchange(ExchangeType.UNISWAP_V3, uniswapV2Exchange.address)

      // then
      await expect(tx).revertedWith('exchange-exists')
    })

    it('should update address of an exchange', async function () {
      // given
      await swapper.setExchange(ExchangeType.PANGOLIN, user.address)
      const allExchangesBefore = await swapper.getAllExchanges()

      // when
      await swapper.setExchange(ExchangeType.PANGOLIN, deployer.address)

      // then
      const addressAfter = await swapper.addressOf(ExchangeType.PANGOLIN)
      expect(addressAfter).eq(deployer.address)
      const allExchangesAfter = await swapper.getAllExchanges()
      expect(allExchangesAfter.length).eq(allExchangesBefore.length)
    })
  })

  describe('setDefaultRouting', function () {
    it('should revert if not governor', async function () {
      const tx = swapper
        .connect(user)
        .setDefaultRouting(SwapType.EXACT_INPUT, WETH, WBTC, ExchangeType.UNISWAP_V3, '0x')
      await expect(tx).revertedWith('not-governor')
    })

    it('should add a default routing', async function () {
      // given
      const key = ethers.utils.solidityPack(['uint8', 'address', 'address'], [SwapType.EXACT_INPUT, DAI, WBTC])
      const before = await swapper.defaultRoutings(key)
      expect(before).eq('0x')

      // when
      const exchangeType = ExchangeType.UNISWAP_V2
      const path = abi.encode(['address[]'], [[DAI, WETH, WBTC]])
      await swapper.setDefaultRouting(SwapType.EXACT_INPUT, DAI, WBTC, exchangeType, path)

      // then
      const after = await swapper.defaultRoutings(key)
      expect(after).eq(abi.encode(['uint8', 'bytes'], [exchangeType, path]))
    })

    it('should remove a default routing', async function () {
      // given
      const key = ethers.utils.solidityPack(['uint8', 'address', 'address'], [SwapType.EXACT_INPUT, DAI, WBTC])
      const exchangeType = ExchangeType.UNISWAP_V2
      const path = abi.encode(['address[]'], [[DAI, WETH, WBTC]])
      await swapper.setDefaultRouting(SwapType.EXACT_INPUT, DAI, WBTC, exchangeType, path)
      const before = await swapper.defaultRoutings(key)
      expect(before).eq(abi.encode(['uint8', 'bytes'], [exchangeType, path]))

      // when
      await swapper.setDefaultRouting(SwapType.EXACT_INPUT, DAI, WBTC, exchangeType, '0x')

      // then
      const after = await swapper.defaultRoutings(key)
      expect(after).eq('0x')
    })
  })
})
