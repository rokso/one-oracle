/* eslint-disable camelcase */
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {ethers} from 'hardhat'
import {ChainlinkAndFallbacksOracle, ChainlinkAndFallbacksOracle__factory} from '../../typechain-types'
import {Address, Provider} from '../../helpers'
import {FakeContract, smock} from '@defi-wonderland/smock'
import {parseEther, timestampFromLatestBlock} from '../helpers'
import {BigNumber} from 'ethers'

const STALE_PERIOD = ethers.constants.MaxUint256
const MAX_DEVIATION = parseEther('0.1') // 10%

const {WETH_ADDRESS, DAI_ADDRESS} = Address.mainnet

// Note: No need to cover all chains on this test
describe('ChainlinkAndFallbacksOracle @mainnet', function () {
  let snapshotId: string
  let deployer: SignerWithAddress
  let alice: SignerWithAddress
  let aggregator: FakeContract
  let chainlinkAndFallbacksOracle: ChainlinkAndFallbacksOracle

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[deployer, alice] = await ethers.getSigners()

    aggregator = await smock.fake('PriceProvidersAggregator')

    const chainlinkAndFallbacksOracleFactory = new ChainlinkAndFallbacksOracle__factory(deployer)
    chainlinkAndFallbacksOracle = await chainlinkAndFallbacksOracleFactory.deploy(
      MAX_DEVIATION,
      STALE_PERIOD,
      Provider.UNISWAP_V3,
      Provider.UNISWAP_V2
    )
    await chainlinkAndFallbacksOracle.deployed()

    const addressProvider = await smock.fake('AddressProvider', {address: Address.ADDRESS_PROVIDER})
    addressProvider.governor.returns(deployer.address)
    addressProvider.providersAggregator.returns(aggregator.address)
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('updateFallbackProviders', function () {
    it('should revert if not governor', async function () {
      const tx = chainlinkAndFallbacksOracle
        .connect(alice)
        .updateFallbackProviders(Provider.UNISWAP_V3, Provider.UNISWAP_V2)
      await expect(tx).revertedWith('not-governor')
    })

    it('should revert if setting fallback provider A as null', async function () {
      const tx = chainlinkAndFallbacksOracle.updateFallbackProviders(Provider.NONE, Provider.UNISWAP_V2)
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
      await chainlinkAndFallbacksOracle.updateFallbackProviders(Provider.UNISWAP_V2, Provider.UNISWAP_V3)

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
      await chainlinkAndFallbacksOracle.updateFallbackProviders(Provider.UNISWAP_V2, Provider.NONE)

      // then
      const after = await Promise.all([
        await chainlinkAndFallbacksOracle.fallbackProviderA(),
        await chainlinkAndFallbacksOracle.fallbackProviderB(),
      ])
      expect(after).deep.eq([Provider.UNISWAP_V2, Provider.NONE])
    })
  })

  describe('getPriceInUsd', function () {
    let lastUpdatedAt: number

    beforeEach(async function () {
      lastUpdatedAt = await timestampFromLatestBlock()
    })

    describe('when price from chainlink is OK', function () {
      it('should get price from chainlink', async function () {
        // given
        const chainlinkPriceInUsd = parseEther('3,000')
        aggregator['getPriceInUsd(uint8,address)'].returns((args: [number, string]) => {
          const [provider] = args
          if (provider === Provider.CHAINLINK) return [chainlinkPriceInUsd, lastUpdatedAt]
        })

        // when
        const priceInUsd = await chainlinkAndFallbacksOracle.getPriceInUsd(WETH_ADDRESS)

        // then
        expect(priceInUsd).eq(chainlinkPriceInUsd)
      })
    })

    describe('when price from chainlink is NOT OK', function () {
      describe('when price from fallback A is OK', function () {
        describe('when fallback B is not set', function () {
          it('should get price from fallback A', async function () {
            // given
            await chainlinkAndFallbacksOracle.updateFallbackProviders(Provider.UNISWAP_V3, Provider.NONE)
            const v3PriceInUsd = parseEther('3,000')
            aggregator['getPriceInUsd(uint8,address)'].returns((args: [number, string]) => {
              const [provider] = args
              if (provider === Provider.CHAINLINK) return [0, 0]
              if (provider === Provider.UNISWAP_V3) return [v3PriceInUsd, lastUpdatedAt]
            })

            // when
            const priceInUsd = await chainlinkAndFallbacksOracle.getPriceInUsd(WETH_ADDRESS)

            // then
            expect(priceInUsd).eq(v3PriceInUsd)
          })
        })

        describe('when price from fallback B is OK', function () {
          describe('when deviation is OK', function () {
            it('should get price from fallback A', async function () {
              // given
              const v3PriceInUsd = parseEther('3,000')
              const v2PriceInUsd = parseEther('2,990')
              aggregator['getPriceInUsd(uint8,address)'].returns((args: [number, string]) => {
                const [provider] = args
                if (provider === Provider.CHAINLINK) return [0, 0]
                if (provider === Provider.UNISWAP_V3) return [v3PriceInUsd, lastUpdatedAt]
                if (provider === Provider.UNISWAP_V2) return [v2PriceInUsd, lastUpdatedAt]
              })

              // when
              const priceInUsd = await chainlinkAndFallbacksOracle.getPriceInUsd(WETH_ADDRESS)

              // then
              expect(priceInUsd).eq(v3PriceInUsd)
            })
          })
          describe('when deviation is NOT OK', function () {
            it('should revert', async function () {
              // given
              const v3PriceInUsd = parseEther('3,000')
              const v2PriceInUsd = parseEther('2,000')
              aggregator['getPriceInUsd(uint8,address)'].returns((args: [number, string]) => {
                const [provider] = args
                if (provider === Provider.CHAINLINK) return [0, 0]
                if (provider === Provider.UNISWAP_V3) return [v3PriceInUsd, lastUpdatedAt]
                if (provider === Provider.UNISWAP_V2) return [v2PriceInUsd, lastUpdatedAt]
              })

              // when
              const call = chainlinkAndFallbacksOracle.getPriceInUsd(WETH_ADDRESS)

              // then
              await expect(call).revertedWith('prices-deviation-too-high')
            })
          })
        })

        describe('when price from fallback B is NOT OK', function () {
          it('should get price from fallback A', async function () {
            // given
            const v3PriceInUsd = parseEther('3,000')
            aggregator['getPriceInUsd(uint8,address)'].returns((args: [number, string]) => {
              const [provider] = args
              if (provider === Provider.CHAINLINK) return [0, 0]
              if (provider === Provider.UNISWAP_V3) return [v3PriceInUsd, lastUpdatedAt]
              if (provider === Provider.UNISWAP_V2) return [0, 0]
            })

            // when
            const priceInUsd = await chainlinkAndFallbacksOracle.getPriceInUsd(WETH_ADDRESS)

            // then
            expect(priceInUsd).eq(v3PriceInUsd)
          })
        })
      })

      describe('when price from fallback A is NOT OK', function () {
        describe('when fallback B is not set', function () {
          it('should revert', async function () {
            // given
            await chainlinkAndFallbacksOracle.updateFallbackProviders(Provider.UNISWAP_V3, Provider.NONE)
            aggregator['getPriceInUsd(uint8,address)'].returns((args: [number, string]) => {
              const [provider] = args
              if (provider === Provider.CHAINLINK) return [0, 0]
              if (provider === Provider.UNISWAP_V3) return [0, 0]
            })

            // when
            const call = chainlinkAndFallbacksOracle.getPriceInUsd(WETH_ADDRESS)

            // then
            await expect(call).revertedWith('fallback-a-failed')
          })
        })

        describe('when price from fallback B is OK', function () {
          it('should get price from fallback B', async function () {
            // given
            const v2PriceInUsd = parseEther('3,000')
            aggregator['getPriceInUsd(uint8,address)'].returns((args: [number, string]) => {
              const [provider] = args
              if (provider === Provider.CHAINLINK) return [0, 0]
              if (provider === Provider.UNISWAP_V3) return [0, 0]
              if (provider === Provider.UNISWAP_V2) return [v2PriceInUsd, lastUpdatedAt]
            })

            // when
            const priceInUsd = await chainlinkAndFallbacksOracle.getPriceInUsd(WETH_ADDRESS)

            // then
            expect(priceInUsd).eq(v2PriceInUsd)
          })
        })

        describe('when price from fallback B is NOT OK', function () {
          it('should revert', async function () {
            // given
            aggregator['getPriceInUsd(uint8,address)'].returns((args: [number, string, string, BigNumber]) => {
              const [provider] = args
              if (provider === Provider.CHAINLINK) return [0, 0]
              if (provider === Provider.UNISWAP_V3) return [0, 0]
              if (provider === Provider.UNISWAP_V2) return [0, 0]
            })

            // when
            const call = chainlinkAndFallbacksOracle.getPriceInUsd(WETH_ADDRESS)

            // then
            await expect(call).revertedWith('fallbacks-failed')
          })
        })
      })
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
            await chainlinkAndFallbacksOracle.updateFallbackProviders(Provider.UNISWAP_V3, Provider.NONE)
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
            await chainlinkAndFallbacksOracle.updateFallbackProviders(Provider.UNISWAP_V3, Provider.NONE)
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

  describe('quoteTokenToUsd', function () {
    let lastUpdatedAt: number

    beforeEach(async function () {
      lastUpdatedAt = await timestampFromLatestBlock()
    })

    describe('when price from chainlink is OK', function () {
      it('should get price from chainlink', async function () {
        // given
        const chainlinkAmounOut = parseEther('3,000')
        aggregator['quoteTokenToUsd(uint8,address,uint256)'].returns((args: [number, string, BigNumber]) => {
          const [provider] = args
          if (provider === Provider.CHAINLINK) return [chainlinkAmounOut, lastUpdatedAt]
        })

        // when
        const amountOut = await chainlinkAndFallbacksOracle.quoteTokenToUsd(WETH_ADDRESS, parseEther('1'))

        // then
        expect(amountOut).eq(chainlinkAmounOut)
      })
    })

    describe('when price from chainlink is NOT OK', function () {
      describe('when price from fallback A is OK', function () {
        describe('when fallback B is not set', function () {
          it('should get price from fallback A', async function () {
            // given
            await chainlinkAndFallbacksOracle.updateFallbackProviders(Provider.UNISWAP_V3, Provider.NONE)
            const v3AmountOut = parseEther('3,000')
            aggregator['quoteTokenToUsd(uint8,address,uint256)'].returns((args: [number, string, BigNumber]) => {
              const [provider] = args
              if (provider === Provider.CHAINLINK) return [0, 0]
              if (provider === Provider.UNISWAP_V3) return [v3AmountOut, lastUpdatedAt]
            })

            // when
            const amountOut = await chainlinkAndFallbacksOracle.quoteTokenToUsd(WETH_ADDRESS, parseEther('1'))

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
              aggregator['quoteTokenToUsd(uint8,address,uint256)'].returns((args: [number, string, BigNumber]) => {
                const [provider] = args
                if (provider === Provider.CHAINLINK) return [0, 0]
                if (provider === Provider.UNISWAP_V3) return [v3AmountOut, lastUpdatedAt]
                if (provider === Provider.UNISWAP_V2) return [v2AmountOut, lastUpdatedAt]
              })

              // when
              const amountOut = await chainlinkAndFallbacksOracle.quoteTokenToUsd(WETH_ADDRESS, parseEther('1'))

              // then
              expect(amountOut).eq(v3AmountOut)
            })
          })
          describe('when deviation is NOT OK', function () {
            it('should revert', async function () {
              // given
              const v3AmountOut = parseEther('3,000')
              const v2AmountOut = parseEther('2,000')
              aggregator['quoteTokenToUsd(uint8,address,uint256)'].returns((args: [number, string, BigNumber]) => {
                const [provider] = args
                if (provider === Provider.CHAINLINK) return [0, 0]
                if (provider === Provider.UNISWAP_V3) return [v3AmountOut, lastUpdatedAt]
                if (provider === Provider.UNISWAP_V2) return [v2AmountOut, lastUpdatedAt]
              })

              // when
              const call = chainlinkAndFallbacksOracle.quoteTokenToUsd(WETH_ADDRESS, parseEther('1'))

              // then
              await expect(call).revertedWith('prices-deviation-too-high')
            })
          })
        })

        describe('when price from fallback B is NOT OK', function () {
          it('should get price from fallback A', async function () {
            // given
            const v3AmountOut = parseEther('3,000')
            aggregator['quoteTokenToUsd(uint8,address,uint256)'].returns((args: [number, string, BigNumber]) => {
              const [provider] = args
              if (provider === Provider.CHAINLINK) return [0, 0]
              if (provider === Provider.UNISWAP_V3) return [v3AmountOut, lastUpdatedAt]
              if (provider === Provider.UNISWAP_V2) return [0, 0]
            })

            // when
            const amountOut = await chainlinkAndFallbacksOracle.quoteTokenToUsd(WETH_ADDRESS, parseEther('1'))

            // then
            expect(amountOut).eq(v3AmountOut)
          })
        })
      })

      describe('when price from fallback A is NOT OK', function () {
        describe('when fallback B is not set', function () {
          it('should revert', async function () {
            // given
            await chainlinkAndFallbacksOracle.updateFallbackProviders(Provider.UNISWAP_V3, Provider.NONE)
            aggregator['quoteTokenToUsd(uint8,address,uint256)'].returns((args: [number, string, BigNumber]) => {
              const [provider] = args
              if (provider === Provider.CHAINLINK) return [0, 0]
              if (provider === Provider.UNISWAP_V3) return [0, 0]
            })

            // when
            const call = chainlinkAndFallbacksOracle.quoteTokenToUsd(WETH_ADDRESS, parseEther('1'))

            // then
            await expect(call).revertedWith('fallback-a-failed')
          })
        })

        describe('when price from fallback B is OK', function () {
          it('should get price from fallback B', async function () {
            // given
            const v2AmountOut = parseEther('3,000')
            aggregator['quoteTokenToUsd(uint8,address,uint256)'].returns((args: [number, string, BigNumber]) => {
              const [provider] = args
              if (provider === Provider.CHAINLINK) return [0, 0]
              if (provider === Provider.UNISWAP_V3) return [0, 0]
              if (provider === Provider.UNISWAP_V2) return [v2AmountOut, lastUpdatedAt]
            })

            // when
            const amountOut = await chainlinkAndFallbacksOracle.quoteTokenToUsd(WETH_ADDRESS, parseEther('1'))

            // then
            expect(amountOut).eq(v2AmountOut)
          })
        })

        describe('when price from fallback B is NOT OK', function () {
          it('should revert', async function () {
            // given
            aggregator['quoteTokenToUsd(uint8,address,uint256)'].returns((args: [number, string, BigNumber]) => {
              const [provider] = args
              if (provider === Provider.CHAINLINK) return [0, 0]
              if (provider === Provider.UNISWAP_V3) return [0, 0]
              if (provider === Provider.UNISWAP_V2) return [0, 0]
            })

            // when
            const call = chainlinkAndFallbacksOracle.quoteTokenToUsd(WETH_ADDRESS, parseEther('1'))

            // then
            await expect(call).revertedWith('fallbacks-failed')
          })
        })
      })
    })
  })

  describe('quoteUsdToToken', function () {
    let lastUpdatedAt: number

    beforeEach(async function () {
      lastUpdatedAt = await timestampFromLatestBlock()
    })

    describe('when price from chainlink is OK', function () {
      it('should get price from chainlink', async function () {
        // given
        const chainlinkAmounOut = parseEther('1')
        aggregator['quoteUsdToToken(uint8,address,uint256)'].returns((args: [number, string, BigNumber]) => {
          const [provider] = args
          if (provider === Provider.CHAINLINK) return [chainlinkAmounOut, lastUpdatedAt]
        })

        // when
        const amountOut = await chainlinkAndFallbacksOracle.quoteUsdToToken(WETH_ADDRESS, parseEther('3,000'))

        // then
        expect(amountOut).eq(chainlinkAmounOut)
      })
    })

    describe('when price from chainlink is NOT OK', function () {
      describe('when price from fallback A is OK', function () {
        describe('when fallback B is not set', function () {
          it('should get price from fallback A', async function () {
            // given
            await chainlinkAndFallbacksOracle.updateFallbackProviders(Provider.UNISWAP_V3, Provider.NONE)
            const v3AmountOut = parseEther('1')
            aggregator['quoteUsdToToken(uint8,address,uint256)'].returns((args: [number, string, BigNumber]) => {
              const [provider] = args
              if (provider === Provider.CHAINLINK) return [0, 0]
              if (provider === Provider.UNISWAP_V3) return [v3AmountOut, lastUpdatedAt]
            })

            // when
            const amountOut = await chainlinkAndFallbacksOracle.quoteUsdToToken(WETH_ADDRESS, parseEther('3,000'))

            // then
            expect(amountOut).eq(v3AmountOut)
          })
        })

        describe('when price from fallback B is OK', function () {
          describe('when deviation is OK', function () {
            it('should get price from fallback A', async function () {
              // given
              const v3AmountOut = parseEther('1')
              const v2AmountOut = parseEther('1.05')
              aggregator['quoteUsdToToken(uint8,address,uint256)'].returns((args: [number, string, BigNumber]) => {
                const [provider] = args
                if (provider === Provider.CHAINLINK) return [0, 0]
                if (provider === Provider.UNISWAP_V3) return [v3AmountOut, lastUpdatedAt]
                if (provider === Provider.UNISWAP_V2) return [v2AmountOut, lastUpdatedAt]
              })

              // when
              const amountOut = await chainlinkAndFallbacksOracle.quoteUsdToToken(WETH_ADDRESS, parseEther('3,000'))

              // then
              expect(amountOut).eq(v3AmountOut)
            })
          })
          describe('when deviation is NOT OK', function () {
            it('should revert', async function () {
              // given
              const v3AmountOut = parseEther('1')
              const v2AmountOut = parseEther('0.66')
              aggregator['quoteUsdToToken(uint8,address,uint256)'].returns((args: [number, string, BigNumber]) => {
                const [provider] = args
                if (provider === Provider.CHAINLINK) return [0, 0]
                if (provider === Provider.UNISWAP_V3) return [v3AmountOut, lastUpdatedAt]
                if (provider === Provider.UNISWAP_V2) return [v2AmountOut, lastUpdatedAt]
              })

              // when
              const call = chainlinkAndFallbacksOracle.quoteUsdToToken(WETH_ADDRESS, parseEther('3,000'))

              // then
              await expect(call).revertedWith('prices-deviation-too-high')
            })
          })
        })

        describe('when price from fallback B is NOT OK', function () {
          it('should get price from fallback A', async function () {
            // given
            const v3AmountOut = parseEther('1')
            aggregator['quoteUsdToToken(uint8,address,uint256)'].returns((args: [number, string, BigNumber]) => {
              const [provider] = args
              if (provider === Provider.CHAINLINK) return [0, 0]
              if (provider === Provider.UNISWAP_V3) return [v3AmountOut, lastUpdatedAt]
              if (provider === Provider.UNISWAP_V2) return [0, 0]
            })

            // when
            const amountOut = await chainlinkAndFallbacksOracle.quoteUsdToToken(WETH_ADDRESS, parseEther('3,000'))

            // then
            expect(amountOut).eq(v3AmountOut)
          })
        })
      })

      describe('when price from fallback A is NOT OK', function () {
        describe('when fallback B is not set', function () {
          it('should revert', async function () {
            // given
            await chainlinkAndFallbacksOracle.updateFallbackProviders(Provider.UNISWAP_V3, Provider.NONE)
            aggregator['quoteUsdToToken(uint8,address,uint256)'].returns((args: [number, string, BigNumber]) => {
              const [provider] = args
              if (provider === Provider.CHAINLINK) return [0, 0]
              if (provider === Provider.UNISWAP_V3) return [0, 0]
            })

            // when
            const call = chainlinkAndFallbacksOracle.quoteUsdToToken(WETH_ADDRESS, parseEther('3,000'))

            // then
            await expect(call).revertedWith('fallback-a-failed')
          })
        })

        describe('when price from fallback B is OK', function () {
          it('should get price from fallback B', async function () {
            // given
            const v2AmountOut = parseEther('1')
            aggregator['quoteUsdToToken(uint8,address,uint256)'].returns((args: [number, string, BigNumber]) => {
              const [provider] = args
              if (provider === Provider.CHAINLINK) return [0, 0]
              if (provider === Provider.UNISWAP_V3) return [0, 0]
              if (provider === Provider.UNISWAP_V2) return [v2AmountOut, lastUpdatedAt]
            })

            // when
            const amountOut = await chainlinkAndFallbacksOracle.quoteUsdToToken(WETH_ADDRESS, parseEther('3,000'))

            // then
            expect(amountOut).eq(v2AmountOut)
          })
        })

        describe('when price from fallback B is NOT OK', function () {
          it('should revert', async function () {
            // given
            aggregator['quoteUsdToToken(uint8,address,uint256)'].returns((args: [number, string, BigNumber]) => {
              const [provider] = args
              if (provider === Provider.CHAINLINK) return [0, 0]
              if (provider === Provider.UNISWAP_V3) return [0, 0]
              if (provider === Provider.UNISWAP_V2) return [0, 0]
            })

            // when
            const call = chainlinkAndFallbacksOracle.quoteUsdToToken(WETH_ADDRESS, parseEther('1'))

            // then
            await expect(call).revertedWith('fallbacks-failed')
          })
        })
      })
    })
  })
})
