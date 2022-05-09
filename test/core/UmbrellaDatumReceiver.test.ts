/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {
  UmbrellaDatumReceiver,
  UmbrellaDatumReceiver__factory,
  IRegistry__factory,
  IERC20,
  IERC20__factory,
} from '../../typechain-types'
import Address from '../../helpers/address'
import {HOUR, impersonateAccount, parseEther} from '../helpers'
import {adjustBalance} from '../helpers/balance'
import {LeafKeyCoder, ABI} from '@umb-network/toolbox'
import {Contract} from 'ethers'

const {UMBRELLA_REGISTRY, UMB_ADDRESS} = Address.bsc

const HEARTBEAT_TIMESTAMP = HOUR.mul(24)
const DEVIATION_THRESHOLD = parseEther('0.01') // 1%

// Note: Passport service is only available on BSC right now
describe('UmbrellaDatumReceiver @bsc', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let governor: SignerWithAddress
  let funder: SignerWithAddress
  let datumReceiver: UmbrellaDatumReceiver
  let datumRegistry: Contract
  let datumRegistryWallet: SignerWithAddress
  let chain: Contract
  let umb: IERC20

  const encodedKeys = [
    `0x${LeafKeyCoder.encode('ETH-USD').toString('hex')}`,
    `0x${LeafKeyCoder.encode('BTC-USD').toString('hex')}`,
  ]

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer, governor, funder] = await ethers.getSigners()

    umb = IERC20__factory.connect(UMB_ADDRESS, funder)
    await adjustBalance(UMB_ADDRESS, funder.address, parseEther('1,000,000'))

    const datumReceiverFactory = new UmbrellaDatumReceiver__factory(deployer)
    datumReceiver = await datumReceiverFactory.deploy(UMBRELLA_REGISTRY, HEARTBEAT_TIMESTAMP, DEVIATION_THRESHOLD)
    await datumReceiver.deployed()
    await datumReceiver.transferGovernorship(governor.address)
    await datumReceiver.connect(governor).acceptGovernorship()

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
    await datumRegistry.create(datumReceiver.address, funder.address, encodedKeys, depositAmount)
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('should perform administrative functions', function () {
    it('should manage balance', async function () {
      // given
      const balanceBefore = await datumRegistry.getBalance(datumReceiver.address, funder.address)

      // when
      await datumRegistry.deposit(datumReceiver.address, balanceBefore)
      await datumRegistry.withdraw(datumReceiver.address, balanceBefore)

      // then
      const balanceAfter = await datumRegistry.getBalance(datumReceiver.address, funder.address)
      expect(balanceAfter).eq(balanceBefore)
    })

    it('should manage keys', async function () {
      // given
      const datumId = await datumRegistry.resolveId(datumReceiver.address, funder.address)
      const [[, keysBefore, , ,]] = await datumRegistry.getManyDatums([datumId])
      expect(keysBefore).deep.eq(encodedKeys)

      // when
      const keysToAdd = [
        `0x${LeafKeyCoder.encode('DAI-USD').toString('hex')}`,
        `0x${LeafKeyCoder.encode('USDC-USD').toString('hex')}`,
      ]
      await datumRegistry.addKeys(datumReceiver.address, keysToAdd)
      await datumRegistry.removeKeys(datumReceiver.address, keysToAdd)

      // then
      const [[, keysAfter, , ,]] = await datumRegistry.getManyDatums([datumId])
      expect(keysAfter).deep.eq(keysBefore)
    })
  })

  describe('approvePallet', function () {})

  describe('receivePallet', function () {
    it('should receive price from datum registry', async function () {
      const lastestBlockId = await chain.getLatestBlockId()
      const latestBlock = await chain.blocks(lastestBlockId)

      const key = `0x${LeafKeyCoder.encode('BTC-USD').toString('hex')}`
      const v = ethers.utils.hexZeroPad(parseEther('31,490').toHexString(), 32)

      await datumReceiver.connect(datumRegistryWallet).receivePallet({
        blockId: lastestBlockId,
        key,
        value: v,
        proof: [],
      })
      const {priceInUsd, lastUpdatedAt} = await datumReceiver.latestPriceOf(key)
      expect(priceInUsd).eq(parseEther('31,490'))
      expect(lastUpdatedAt).eq(latestBlock.dataTimestamp)
    })
  })

  describe('updateHeartbeatTimestamp', function () {})

  describe('updateDeviationThreshold', function () {})
})
