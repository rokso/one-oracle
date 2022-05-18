/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {ChainlinkAndFallbacksOracle, ChainlinkAndFallbacksOracle__factory} from '../../typechain-types'
import Address from '../../helpers/address'
import {FakeContract, smock} from '@defi-wonderland/smock'
import {parseEther, timestampFromLatestBlock, Provider} from '../helpers'
import {BigNumber} from 'ethers'

const STALE_PERIOD = ethers.constants.MaxUint256
const MAX_DEVIATION = parseEther('0.1') // 10%

const {WETH_ADDRESS, DAI_ADDRESS} = Address.mainnet

// Note: No need to cover all chains on this test
describe('ChainlinkAndFallbacksOracle @mainnet', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let governor: SignerWithAddress
  let aggregator: FakeContract
  let chainlinkAndFallbacksOracle: ChainlinkAndFallbacksOracle

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer, governor] = await ethers.getSigners()

    aggregator = await smock.fake('PriceProvidersAggregator')

    const chainlinkAndFallbacksOracleFactory = new ChainlinkAndFallbacksOracle__factory(deployer)
    chainlinkAndFallbacksOracle = await chainlinkAndFallbacksOracleFactory.deploy(
      aggregator.address,
      MAX_DEVIATION,
      STALE_PERIOD,
      Provider.UNISWAP_V3,
      Provider.UNISWAP_V2
    )
    await chainlinkAndFallbacksOracle.deployed()
    await chainlinkAndFallbacksOracle.transferGovernorship(governor.address)
    await chainlinkAndFallbacksOracle.connect(governor).acceptGovernorship()
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('updateFallbackProviders', function () {
    it('should revert if not governor', async function () {
      const tx = chainlinkAndFallbacksOracle.updateFallbackProviders(Provider.UNISWAP_V3, Provider.UNISWAP_V2)
      await expect(tx).revertedWith('not-governor')
    })

    it('should revert if setting fallback provider A as null', async function () {
      const tx = chainlinkAndFallbacksOracle
        .connect(governor)
        .updateFallbackProviders(Provider.NONE, Provider.UNISWAP_V2)
      await expect(tx).revertedWith('fallback-a-is-null')
    })

    it('should update both fallback providers', async function () {
      // given
      const before = await Promise.all([
        await chainlinkAndFallbacksOracle.fallbackProviderA(),
        await chainlinkAndFallbacksOracle.fallbackProviderB(),
      ])
      expect(before).deep.eq([Provider.UNISWAP_V3, Provider.UNISWAP_V2])

      // when
      await chainlinkAndFallbacksOracle
        .connect(governor)
        .updateFallbackProviders(Provider.UNISWAP_V2, Provider.UNISWAP_V3)

      // then
      const after = await Promise.all([
        await chainlinkAndFallbacksOracle.fallbackProviderA(),
        await chainlinkAndFallbacksOracle.fallbackProviderB(),
      ])
      expect(after).deep.eq([Provider.UNISWAP_V2, Provider.UNISWAP_V3])
    })

    it('should set fallback provider B as null', async function () {
      // given
      const before = await Promise.all([
        await chainlinkAndFallbacksOracle.fallbackProviderA(),
        await chainlinkAndFallbacksOracle.fallbackProviderB(),
      ])
      expect(before).deep.eq([Provider.UNISWAP_V3, Provider.UNISWAP_V2])

      // when
      await chainlinkAndFallbacksOracle.connect(governor).updateFallbackProviders(Provider.UNISWAP_V2, Provider.NONE)

      // then
      const after = await Promise.all([
        await chainlinkAndFallbacksOracle.fallbackProviderA(),
        await chainlinkAndFallbacksOracle.fallbackProviderB(),
      ])
      expect(after).deep.eq([Provider.UNISWAP_V2, Provider.NONE])
    })
  })

  describe('quote', function () {
    let lastUpdatedAt: number

    beforeEach(async function () {
      lastUpdatedAt = await timestampFromLatestBlock()
    })

    describe('when price from chainlink is OK', function () {
      it('should get price from chainlink', async function () {
        // given
        const chainlinkAmounOut = parseEther('3,000')
        aggregator['quote(uint8,address,address,uint256)'].returns((args: [number, string, string, BigNumber]) => {
          const [provider] = args
          if (provider === Provider.CHAINLINK) return [chainlinkAmounOut, lastUpdatedAt]
        })

        // when
        const amountOut = await chainlinkAndFallbacksOracle.quote(WETH_ADDRESS, DAI_ADDRESS, parseEther('1'))

        // then
        expect(amountOut).eq(chainlinkAmounOut)
      })
    })

    describe('when price from chainlink is NOT OK', function () {
      describe('when price from fallback A is OK', function () {
        describe('when fallback B is not set', function () {
          it('should get price from fallback A', async function () {
            // given
            await chainlinkAndFallbacksOracle
              .connect(governor)
              .updateFallbackProviders(Provider.UNISWAP_V3, Provider.NONE)
            const v3AmountOut = parseEther('3,000')
            aggregator['quote(uint8,address,address,uint256)'].returns((args: [number, string, string, BigNumber]) => {
              const [provider] = args
              if (provider === Provider.CHAINLINK) return [0, 0]
              if (provider === Provider.UNISWAP_V3) return [v3AmountOut, lastUpdatedAt]
            })

            // when
            const amountOut = await chainlinkAndFallbacksOracle.quote(WETH_ADDRESS, DAI_ADDRESS, parseEther('1'))

            // then
            expect(amountOut).eq(v3AmountOut)
          })
        })

        describe('when price from fallback B is OK', function () {
          describe('when deviation is OK', function () {
            it('should get price from fallback A', async function () {
              // given
              const v3AmountOut = parseEther('3,000')
              const v2AmountOut = parseEther('2,990')
              aggregator['quote(uint8,address,address,uint256)'].returns(
                (args: [number, string, string, BigNumber]) => {
                  const [provider] = args
                  if (provider === Provider.CHAINLINK) return [0, 0]
                  if (provider === Provider.UNISWAP_V3) return [v3AmountOut, lastUpdatedAt]
                  if (provider === Provider.UNISWAP_V2) return [v2AmountOut, lastUpdatedAt]
                }
              )

              // when
              const amountOut = await chainlinkAndFallbacksOracle.quote(WETH_ADDRESS, DAI_ADDRESS, parseEther('1'))

              // then
              expect(amountOut).eq(v3AmountOut)
            })
          })
          describe('when deviation is NOT OK', function () {
            it('should revert', async function () {
              // given
              const v3AmountOut = parseEther('3,000')
              const v2AmountOut = parseEther('2,000')
              aggregator['quote(uint8,address,address,uint256)'].returns(
                (args: [number, string, string, BigNumber]) => {
                  const [provider] = args
                  if (provider === Provider.CHAINLINK) return [0, 0]
                  if (provider === Provider.UNISWAP_V3) return [v3AmountOut, lastUpdatedAt]
                  if (provider === Provider.UNISWAP_V2) return [v2AmountOut, lastUpdatedAt]
                }
              )

              // when
              const call = chainlinkAndFallbacksOracle.quote(WETH_ADDRESS, DAI_ADDRESS, parseEther('1'))

              // then
              await expect(call).revertedWith('prices-deviation-too-high')
            })
          })
        })

        describe('when price from fallback B is NOT OK', function () {
          it('should get price from fallback A', async function () {
            // given
            const v3AmountOut = parseEther('3,000')
            aggregator['quote(uint8,address,address,uint256)'].returns((args: [number, string, string, BigNumber]) => {
              const [provider] = args
              if (provider === Provider.CHAINLINK) return [0, 0]
              if (provider === Provider.UNISWAP_V3) return [v3AmountOut, lastUpdatedAt]
              if (provider === Provider.UNISWAP_V2) return [0, 0]
            })

            // when
            const amountOut = await chainlinkAndFallbacksOracle.quote(WETH_ADDRESS, DAI_ADDRESS, parseEther('1'))

            // then
            expect(amountOut).eq(v3AmountOut)
          })
        })
      })

      describe('when price from fallback A is NOT OK', function () {
        describe('when fallback B is not set', function () {
          it('should revert', async function () {
            // given
            await chainlinkAndFallbacksOracle
              .connect(governor)
              .updateFallbackProviders(Provider.UNISWAP_V3, Provider.NONE)
            aggregator['quote(uint8,address,address,uint256)'].returns((args: [number, string, string, BigNumber]) => {
              const [provider] = args
              if (provider === Provider.CHAINLINK) return [0, 0]
              if (provider === Provider.UNISWAP_V3) return [0, 0]
            })

            // when
            const call = chainlinkAndFallbacksOracle.quote(WETH_ADDRESS, DAI_ADDRESS, parseEther('1'))

            // then
            await expect(call).revertedWith('fallback-a-failed')
          })
        })

        describe('when price from fallback B is OK', function () {
          it('should get price from fallback B', async function () {
            // given
            const v2AmountOut = parseEther('3,000')
            aggregator['quote(uint8,address,address,uint256)'].returns((args: [number, string, string, BigNumber]) => {
              const [provider] = args
              if (provider === Provider.CHAINLINK) return [0, 0]
              if (provider === Provider.UNISWAP_V3) return [0, 0]
              if (provider === Provider.UNISWAP_V2) return [v2AmountOut, lastUpdatedAt]
            })

            // when
            const amountOut = await chainlinkAndFallbacksOracle.quote(WETH_ADDRESS, DAI_ADDRESS, parseEther('1'))

            // then
            expect(amountOut).eq(v2AmountOut)
          })
        })

        describe('when price from fallback B is NOT OK', function () {
          it('should revert', async function () {
            // given
            aggregator['quote(uint8,address,address,uint256)'].returns((args: [number, string, string, BigNumber]) => {
              const [provider] = args
              if (provider === Provider.CHAINLINK) return [0, 0]
              if (provider === Provider.UNISWAP_V3) return [0, 0]
              if (provider === Provider.UNISWAP_V2) return [0, 0]
            })

            // when
            const call = chainlinkAndFallbacksOracle.quote(WETH_ADDRESS, DAI_ADDRESS, parseEther('1'))

            // then
            await expect(call).revertedWith('fallbacks-failed')
          })
        })
      })
    })
  })
})
