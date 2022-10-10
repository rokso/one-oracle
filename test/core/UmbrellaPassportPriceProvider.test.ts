/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {
  UmbrellaPassportPriceProvider,
  UmbrellaPassportPriceProvider__factory,
  IRegistry__factory,
  IERC20,
  IERC20__factory,
} from '../../typechain-types'
import Address from '../../helpers/address'
import {HOUR, impersonateAccount, MINUTE, parseEther} from '../helpers'
import {adjustBalance} from '../helpers/balance'
import {ABI} from '@umb-network/toolbox'
import {Contract} from 'ethers'
import {encodeKeys, encodeKey, encodeValue} from '../helpers/umbrella'
import {smock} from '@defi-wonderland/smock'
import Quote from '../helpers/quotes'

const {
  Umbrella: {UMBRELLA_REGISTRY, UMB},
  WETH,
  USDC,
} = Address.bsc

const HEARTBEAT_TIMESTAMP = HOUR.mul(24)
const DEVIATION_THRESHOLD = parseEther('0.01') // 1%

// Note: Passport service is only available on BSC right now
describe('UmbrellaPassportPriceProvider @bsc', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let alice: SignerWithAddress
  let funder: SignerWithAddress
  let priceProvider: UmbrellaPassportPriceProvider
  let datumRegistry: Contract
  let datumRegistryWallet: SignerWithAddress
  let chain: Contract
  let umb: IERC20

  const encodedKeys = encodeKeys(['ETH-USD', 'BTC-USD'])

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer, alice, funder] = await ethers.getSigners()

    const addressProvider = await smock.fake('AddressProvider', {address: Address.ADDRESS_PROVIDER})
    addressProvider.governor.returns(deployer.address)

    umb = IERC20__factory.connect(UMB, funder)
    await adjustBalance(UMB, funder.address, parseEther('1,000,000'))

    const datumReceiverFactory = new UmbrellaPassportPriceProvider__factory(deployer)
    priceProvider = await datumReceiverFactory.deploy(UMBRELLA_REGISTRY, HEARTBEAT_TIMESTAMP, DEVIATION_THRESHOLD)
    await priceProvider.deployed()

    const umbrellaRegistry = IRegistry__factory.connect(UMBRELLA_REGISTRY, deployer)
    const datumRegistryAddress = await umbrellaRegistry.getAddressByString('DatumRegistry')
    expect(datumRegistryAddress).not.eq(ethers.constants.AddressZero)
    datumRegistry = new ethers.Contract(datumRegistryAddress, ABI.datumRegistryAbi, funder)
    datumRegistryWallet = await impersonateAccount(datumRegistry.address)

    const chainAddress = await umbrellaRegistry.getAddressByString('Chain')
    chain = new ethers.Contract(chainAddress, ABI.chainAbi, deployer)

    // Register DatumReceiver
    const depositAmount = parseEther('100')
    await umb.approve(datumRegistry.address, ethers.constants.MaxUint256)
    await datumRegistry.create(priceProvider.address, funder.address, encodedKeys, depositAmount)
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('should perform administrative functions', function () {
    it('should manage balance', async function () {
      // given
      const balanceBefore = await datumRegistry.getBalance(priceProvider.address, funder.address)

      // when
      await datumRegistry.deposit(priceProvider.address, balanceBefore)
      await datumRegistry.withdraw(priceProvider.address, balanceBefore)

      // then
      const balanceAfter = await datumRegistry.getBalance(priceProvider.address, funder.address)
      expect(balanceAfter).eq(balanceBefore)
    })

    it('should manage keys', async function () {
      // given
      const datumId = await datumRegistry.resolveId(priceProvider.address, funder.address)
      const [[, keysBefore, , ,]] = await datumRegistry.getManyDatums([datumId])
      expect(keysBefore).deep.eq(encodedKeys)

      // when
      const keysToAdd = encodeKeys(['DAI-USD', 'USDC-USD'])
      await datumRegistry.addKeys(priceProvider.address, keysToAdd)
      await datumRegistry.removeKeys(priceProvider.address, keysToAdd)

      // then
      const [[, keysAfter, , ,]] = await datumRegistry.getManyDatums([datumId])
      expect(keysAfter).deep.eq(keysBefore)
    })
  })

  describe('approvePallet', function () {
    const heartbeat = MINUTE.mul(3).toNumber()
    const key = encodeKey('BTC-USD')
    const currentPrice = 32023.23
    let lastUpdatedAt: number

    beforeEach(async function () {
      await priceProvider.updateHeartbeatTimestamp(heartbeat)

      const blockId = (await chain.getLatestBlockId()) - 5 // ~5 min before the latest block
      const block = await chain.blocks(blockId)
      await priceProvider
        .connect(datumRegistryWallet)
        .receivePallet({blockId, key, value: encodeValue(currentPrice), proof: []})

      lastUpdatedAt = block.dataTimestamp
    })

    it('should return true if did reach heartbeat and deviation', async function () {
      // given
      const blockId = await chain.getLatestBlockId()
      const block = await chain.blocks(blockId)
      expect(block.dataTimestamp).gt(lastUpdatedAt + heartbeat)
      const value = encodeValue(currentPrice * 2)

      // when-then
      expect(await priceProvider.approvePallet({blockId, key, value, proof: []})).eq(true)
    })

    it('should return true if did reach heartbeat and did not reach deviation', async function () {
      // given
      const blockId = await chain.getLatestBlockId()
      const block = await chain.blocks(blockId)
      expect(block.dataTimestamp).gt(lastUpdatedAt + heartbeat)
      const value = encodeValue(currentPrice)

      // when-then
      expect(await priceProvider.approvePallet({blockId, key, value, proof: []})).eq(true)
    })

    it('should return true if did not reach heartbeat and did reach deviation', async function () {
      // given
      const blockId = (await chain.getLatestBlockId()) - 10
      const block = await chain.blocks(blockId)
      expect(block.dataTimestamp).lt(lastUpdatedAt + heartbeat)
      const value = encodeValue(currentPrice * 2)

      // when-then
      expect(await priceProvider.approvePallet({blockId, key, value, proof: []})).eq(true)
    })

    it('should revert if did not reach heartbeat nor deviation', async function () {
      // given
      const blockId = (await chain.getLatestBlockId()) - 10
      const block = await chain.blocks(blockId)
      expect(block.dataTimestamp).lt(lastUpdatedAt + heartbeat)
      const value = encodeValue(currentPrice)

      // when-then
      await expect(priceProvider.approvePallet({blockId, key, value, proof: []})).revertedWith(
        'did-not-match-conditions'
      )
    })
  })

  describe('receivePallet', function () {
    beforeEach(async function () {
      priceProvider = priceProvider.connect(datumRegistryWallet)
    })

    it('should revert if sender is not datum registry', async function () {
      // when
      const blockId = await chain.getLatestBlockId()
      const key = encodeKey('BTC-USD')
      const value = encodeValue(32023.23)
      const tx = priceProvider.connect(deployer).receivePallet({blockId, key, value, proof: []})

      // then
      await expect(tx).revertedWith('not-datum-registry')
    })

    it('should revert if receiving same blockId/key pair twice', async function () {
      // given
      const blockId = await chain.getLatestBlockId()
      const key = encodeKey('BTC-USD')
      const value = encodeValue(32023.23)
      await priceProvider.receivePallet({blockId, key, value, proof: []})

      // when
      const tx = priceProvider.receivePallet({blockId, key, value, proof: []})

      // then
      await expect(tx).revertedWith('update-already-received')
    })

    it('should receive prices from same blockId if keys are different', async function () {
      // given
      const keyBTC = encodeKey('BTC-USD')
      const keyETH = encodeKey('ETH-USD')
      const blockId = await chain.getLatestBlockId()
      const latestBlock = await chain.blocks(blockId)

      // when
      await priceProvider.receivePallet({blockId, key: keyBTC, value: encodeValue(32023.23), proof: []})
      await priceProvider.receivePallet({blockId, key: keyETH, value: encodeValue(2431.41), proof: []})

      // then
      const btc = await priceProvider.latestPriceOf(keyBTC)
      const eth = await priceProvider.latestPriceOf(keyETH)
      expect(btc.priceInUsd).eq(parseEther('32,023.23'))
      expect(eth.priceInUsd).eq(parseEther('2,431.41'))
      expect(btc.lastUpdatedAt).eq(eth.lastUpdatedAt).eq(latestBlock.dataTimestamp)
    })

    it('should receive price from datum registry', async function () {
      // given
      const key = encodeKey('BTC-USD')
      const before = await priceProvider.latestPriceOf(key)
      expect(before.priceInUsd).eq(0)
      expect(before.lastUpdatedAt).eq(0)

      // when
      const blockId = await chain.getLatestBlockId()
      const latestBlock = await chain.blocks(blockId)
      await priceProvider.receivePallet({blockId, key, value: encodeValue(32023.23), proof: []})

      // then
      const {priceInUsd, lastUpdatedAt} = await priceProvider.latestPriceOf(key)
      expect(priceInUsd).eq(parseEther('32,023.23'))
      expect(lastUpdatedAt).eq(latestBlock.dataTimestamp)
    })
  })

  describe('updateHeartbeatTimestamp', function () {
    it('should revert if sender is not governor', async function () {
      // when
      const tx = priceProvider.connect(alice).updateHeartbeatTimestamp(123)

      // then
      await expect(tx).revertedWith('not-governor')
    })

    it('should update heartbeat', async function () {
      // given
      const {heartbeatTimestamp: before} = await priceProvider.updatePolicy()

      // when
      const after = before.mul('2')
      expect(after).not.eq(before)
      await priceProvider.updateHeartbeatTimestamp(after)

      // then
      const {heartbeatTimestamp} = await priceProvider.updatePolicy()
      expect(heartbeatTimestamp).eq(after)
    })
  })

  describe('updateDeviationThreshold', function () {
    it('should revert if sender is not governor', async function () {
      // when
      const tx = priceProvider.connect(alice).updateDeviationThreshold(123)

      // then
      await expect(tx).revertedWith('not-governor')
    })

    it('should update deviation threshold', async function () {
      // given
      const {deviationThreshold: before} = await priceProvider.updatePolicy()

      // when
      const after = before.mul('2')
      expect(after).not.eq(before)
      await priceProvider.updateDeviationThreshold(after)

      // then
      const {deviationThreshold} = await priceProvider.updatePolicy()
      expect(deviationThreshold).eq(after)
    })
  })

  describe('getPriceInUsd', function () {
    beforeEach(async function () {
      await priceProvider.updateKeyOfToken(WETH, 'ETH-USD')
    })

    // Note: price is outdated
    it.skip('should get price from Chain if it is the latest ', async function () {
      // when
      const key = encodeKey('ETH-USD')
      const {priceInUsd: priceInUsd0, lastUpdatedAt: lastUpdatedAt0} = await priceProvider.latestPriceOf(key)
      expect(lastUpdatedAt0).eq(0)
      expect(priceInUsd0).eq(0)

      // then
      const {_priceInUsd: priceInUsd1, _lastUpdatedAt: lastUpdatedAt1} = await priceProvider.getPriceInUsd(WETH)

      // then
      expect(lastUpdatedAt1).gt(0)
      expect(priceInUsd1).closeTo(Quote.bsc.ETH_USD, parseEther('1'))
    })

    it('should get price from Passport if it is the latest ', async function () {
      // given
      const {_lastUpdatedAt: lastUpdatedAtFromChain} = await priceProvider.getPriceInUsd(WETH)
      const key = encodeKey('ETH-USD')
      const blockId = await chain.getLatestBlockId()
      const latestBlock = await chain.blocks(blockId)
      await priceProvider
        .connect(datumRegistryWallet)
        .receivePallet({blockId, key, value: encodeValue(2431.41), proof: []})
      const {lastUpdatedAt: lastUpdatedAtFromPassport} = await priceProvider.latestPriceOf(key)
      expect(lastUpdatedAtFromPassport).gte(lastUpdatedAtFromChain)

      // then
      const {_priceInUsd: priceInUsd, _lastUpdatedAt: lastUpdatedAt} = await priceProvider.getPriceInUsd(WETH)

      // then
      expect(lastUpdatedAt).eq(latestBlock.dataTimestamp)
      expect(priceInUsd).eq(parseEther('2,431.41'))
    })

    it('should revert if did not find price for the token', async function () {
      // when
      const key = encodeKey('USDC-USD')
      const {priceInUsd: priceInUsd0, lastUpdatedAt: lastUpdatedAt0} = await priceProvider.latestPriceOf(key)
      expect(lastUpdatedAt0).eq(0)
      expect(priceInUsd0).eq(0)

      // then
      const tx = priceProvider.getPriceInUsd(USDC)

      // then
      await expect(tx).revertedWith('invalid-quote')
    })
  })
})
