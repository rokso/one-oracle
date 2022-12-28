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

const {WETH, DAI, WBTC, STETH, UNISWAP_V2_FACTORY_ADDRESS, Curve, USDC, USDT} = Address.mainnet
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

    await adjustBalance(weth.address, deployer.address, parseEther('1,000,000'))
    await adjustBalance(dai.address, deployer.address, parseEther('1,000,000'))
    await adjustBalance(wbtc.address, deployer.address, parseUnits('1,000,000', 8))
    await adjustBalance(steth.address, deployer.address, parseEther('1,000'))
    await adjustBalance(usdc.address, deployer.address, parseUnits('1,000', 6))

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
