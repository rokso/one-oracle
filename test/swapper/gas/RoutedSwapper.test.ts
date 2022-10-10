/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {
  UniswapV2LikeExchange,
  UniswapV3Exchange,
  RoutedSwapper,
  RoutedSwapper__factory,
  IERC20,
  IERC20__factory,
  UniswapV2LikeExchange__factory,
  UniswapV3Exchange__factory,
} from '../../../typechain-types'
import {Address, ExchangeType, SwapType, InitCodeHash} from '../../../helpers'
import {parseEther, parseUnits} from '../../helpers'
import {adjustBalance} from '../../helpers/balance'
import {smock} from '@defi-wonderland/smock'

const {
  WETH,
  DAI,
  WBTC,
  USDC,
  Chainlink: {NOT_ON_CHAINLINK_TOKEN: BTT},
  UNISWAP_V2_FACTORY_ADDRESS,
} = Address.mainnet

const UNISWAP_INIT_CODE_HASH = InitCodeHash[UNISWAP_V2_FACTORY_ADDRESS]

describe('GasUsage:RoutedSwapper @mainnet', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let uniswapV2Exchange: UniswapV2LikeExchange
  let uniswapV3Exchange: UniswapV3Exchange
  let uniswapV3DefaultPoolFee: number
  let swapper: RoutedSwapper
  let weth: IERC20
  let dai: IERC20
  let wbtc: IERC20
  let usdc: IERC20
  let btt: IERC20

  beforeEach(async function () {
    // Essentially we are making sure we execute setup once only
    // Check whether we ever created snapshot before.
    if (snapshotId) {
      // Recreate snapshot and return.
      snapshotId = await ethers.provider.send('evm_snapshot', [])
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-extra-semi
    ;[deployer] = await ethers.getSigners()

    const addressProvider = await smock.fake('AddressProvider', {address: Address.ADDRESS_PROVIDER})
    addressProvider.governor.returns(deployer.address)

    weth = IERC20__factory.connect(WETH, deployer)
    dai = IERC20__factory.connect(DAI, deployer)
    wbtc = IERC20__factory.connect(WBTC, deployer)
    usdc = IERC20__factory.connect(USDC, deployer)
    btt = IERC20__factory.connect(BTT, deployer)

    await adjustBalance(weth.address, deployer.address, parseEther('1,000,000'))
    await adjustBalance(dai.address, deployer.address, parseEther('1,000,000'))
    await adjustBalance(wbtc.address, deployer.address, parseUnits('1,000,000', 8))
    await adjustBalance(usdc.address, deployer.address, parseUnits('1,000,000', 6))
    await adjustBalance(btt.address, deployer.address, parseEther('1,000,000,000,000'))

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
    uniswapV3DefaultPoolFee = await uniswapV3Exchange.defaultPoolFee()

    //
    // Swapper Setup
    //
    const swapperFactory = new RoutedSwapper__factory(deployer)
    swapper = await swapperFactory.deploy()
    await swapper.deployed()

    await swapper.setExchange(ExchangeType.UNISWAP_V2, uniswapV2Exchange.address)
    await swapper.setExchange(ExchangeType.UNISWAP_V3, uniswapV3Exchange.address)
    // Take snapshot of setup
    snapshotId = await ethers.provider.send('evm_snapshot', [])
  })

  afterEach(async function () {
    // Revert to snapshot point
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('worst case: 3 length path', function () {
    describe('with default routing', function () {
      beforeEach(async function () {
        const defaultPath = ethers.utils.solidityPack(
          ['address', 'uint24', 'address', 'uint24', 'address'],
          [WBTC, uniswapV3DefaultPoolFee, WETH, uniswapV3DefaultPoolFee, BTT]
        )

        await swapper.setDefaultRouting(SwapType.EXACT_INPUT, WBTC, BTT, ExchangeType.UNISWAP_V3, defaultPath)

        await swapper.setDefaultRouting(SwapType.EXACT_OUTPUT, BTT, WBTC, ExchangeType.UNISWAP_V3, defaultPath)
      })

      it('getBestAmountOut', async function () {
        const amountIn = parseUnits('0.001', 8)
        const tx = await swapper.getAmountOut(WBTC, BTT, amountIn)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).lte('194349')
      })

      it('swapExactInput', async function () {
        // given
        const amountIn = parseUnits('0.001', 8)

        // when
        await wbtc.approve(swapper.address, amountIn)
        const tx1 = await swapper.swapExactInput(WBTC, BTT, amountIn, 0, deployer.address)
        await wbtc.approve(swapper.address, amountIn)
        const tx2 = await swapper.swapExactInput(WBTC, BTT, amountIn, 0, deployer.address)

        // then
        expect((await tx1.wait()).gasUsed).lte('240983')
        expect((await tx2.wait()).gasUsed).lte('220578')
      })

      it('getBestAmountIn', async function () {
        const amountOut = parseUnits('0.001', 8)
        const tx = await swapper.getAmountIn(BTT, WBTC, amountOut)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).lte('200231')
      })

      it('swapExactOutput', async function () {
        // given
        const amountOut = parseUnits('0.001', 8)
        const amountIn = await swapper.callStatic.getAmountIn(BTT, WBTC, amountOut)
        const amountInMax = amountIn.mul('2')

        // when
        await btt.approve(swapper.address, amountInMax)
        const tx1 = await swapper.swapExactOutput(BTT, WBTC, amountOut, amountInMax, deployer.address)
        await btt.approve(swapper.address, amountInMax)
        const tx2 = await swapper.swapExactOutput(BTT, WBTC, amountOut, amountInMax, deployer.address)

        // then
        expect((await tx1.wait()).gasUsed).lte('241423')
        expect((await tx2.wait()).gasUsed).lte('221114')
      })
    })
  })

  describe('best case: 2 length path', function () {
    const abi = ethers.utils.defaultAbiCoder
    const wbtc2wethPath = abi.encode(['address[]'], [[WBTC, WETH]])
    const weth2btcPath = abi.encode(['address[]'], [[WETH, WBTC]])

    beforeEach(async function () {
      await swapper.setDefaultRouting(SwapType.EXACT_INPUT, WBTC, WETH, ExchangeType.UNISWAP_V2, wbtc2wethPath)
      await swapper.setDefaultRouting(SwapType.EXACT_OUTPUT, WETH, WBTC, ExchangeType.UNISWAP_V2, weth2btcPath)
    })

    it('getBestAmountOut', async function () {
      const amountIn = parseUnits('0.001', 8)
      const tx = await swapper.getAmountOut(WBTC, WETH, amountIn)
      const receipt = await tx.wait()
      expect(receipt.gasUsed).lte('58259')
    })

    it('swapExactInput', async function () {
      // given
      const amountIn = parseUnits('0.001', 8)

      // when
      await wbtc.approve(swapper.address, amountIn)
      const tx1 = await swapper.swapExactInput(WBTC, WETH, amountIn, 0, deployer.address)
      await wbtc.approve(swapper.address, amountIn)
      const tx2 = await swapper.swapExactInput(WBTC, WETH, amountIn, 0, deployer.address)

      // then
      expect((await tx1.wait()).gasUsed).lte('144840')
      expect((await tx2.wait()).gasUsed).lte('144840')
    })

    it('getBestAmountIn', async function () {
      const amountOut = parseUnits('0.001', 8)
      const tx = await swapper.getAmountIn(WETH, WBTC, amountOut)
      const receipt = await tx.wait()
      expect(receipt.gasUsed).lte('58287')
    })

    it('swapExactOutput', async function () {
      // given
      const amountOut = parseUnits('0.001', 8)
      const amountIn = await swapper.callStatic.getAmountIn(WETH, WBTC, amountOut)
      const amountInMax = amountIn.mul('2')
      await weth.approve(swapper.address, amountInMax)
      const tx1 = await swapper.swapExactOutput(WETH, WBTC, amountOut, amountInMax, deployer.address)

      // when
      await weth.approve(swapper.address, amountInMax)
      const tx2 = await swapper.swapExactOutput(WETH, WBTC, amountOut, amountInMax, deployer.address)

      // then
      expect((await tx1.wait()).gasUsed).lte('148801')
      expect((await tx2.wait()).gasUsed).lte('148801')
    })
  })
})
