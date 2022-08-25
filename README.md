# One Oracle

The `one-oracle` repository has two modules, the `OneOracle` and the `Swapper`.

1. The `OneOracle` has a set of contracts that implement price oracles from different sources (e.g. Chainlink, UniswapV2, UniswapV3, etc). This module has two layers: `core` and `periphery`: the `core` contains the base ground with well flexible interfaces that can be easily reused. The `periphery` layer has oracle contracts built on top of the `core`. Any external project that needs an oracle, can interact with one of the periphery contracts or implement a new custom periphery contract if needed.

2. The `Swapper` module encapsulates token swap logic by looking for the best swap path among available DEXes and interacts with `ChainlinkAndFallbacksOracle` (from `OneOracle/periphery`) for slippage check.

## Highlevel Architecture

### Oracle

```
  ┌───────────────────────────────────────────────────────────────────────────────────────────────────────┐
  │                                                                                                       │
  │                                                                                                       │
  │                                    ┌──────────────────────────────┐                                   │
  │                                    │ ChainlinkAndFallbacksOracle  │                                   │
  │                                    └─────────────┬────────────────┘                                   │
  │                                                  │                                                    │
  │ periphery                                        │                                                    │
  ├──────────────────────────────────────────────────┼────────────────────────────────────────────────────┤
  │ core                                             │                                                    │
  │                                                  │                                                    │
  │                                                  │                                                    │
  │                                      ┌───────────▼──────────────┐                                     │
  │                                      │ PriceProvidersAggregator │                                     │
  │                                      └─────────┬────────────────┘                                     │
  │                                                │                                                      │
  │              ┌──────────────────┬──────────────┼────────────────┬────────────┬─────────────────┐      │
  │              │                  │              │                │            │                 │      │
  │              │                  │              │                │            │                 │      │
  │              │                  │              │                │            │                 │      │
  │  ┌───────────▼────────────────┐ │   ┌──────────▼─────────────┐  │  ┌─────────▼─────────────┐   │      │
  │  │ UniswapV2LikePriceProvider │ │   │ ChainlinkPriceProvider │  │  │ UmbrellaPriceProvider │   │      │
  │  └────────────────────────────┘ │   └────────────────────────┘  │  └───────────────────────┘   │      │
  │                                 │                               │                              │      │
  │                                 │                               │                              │      │
  │                       ┌─────────▼──────────────┐       ┌────────┴──────────┐    ┌─ ─ ─ ─ ─ ─ ─ ▼ ──┐  │
  │                       │ UniswapV3PriceProvider │       │ FluxPriceProvider │    │ XYZPriceProvider │  │
  │                       └────────────────────────┘       └───────────────────┘    └─ ─ ─ ─ ─ ─ ── ─ ─┘  │
  │                                                                                                       │
  │                                                                                                       │
  └───────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Swapper

```
     ┌────────────────────────────────────────────────────────────────────────────┐
     │                                                                            │
     │          ┌───────────┐                                                     │
     │          │  Swapper  ├─────────────────────────┐                           │
     │          └─────┬─────┘                         │                           │
     │                │                  ┌────────────┼───────────┐               │
     │                │                  │            │           │               │
     │                │                  │            │           │               │
     │                │                  │            │           │               │
     │                │      ┌───────────▼──────────┐ │ ┌─ ─ ─ ─ ─▼─ ─ ─ ─ ─┐     │
     │                │      │ UniswapV2LikeExchange│ │ │ UniswapV3Exchange │     │
     │                │      └──────────────────────┘ │ └─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘     │
     │                │       UniswapV2               │                           │
     │                │       Sushiswap               │                           │
     │                │       etc                     │                           │
     │                │                               │                           │
     │                │                         ┌─ ─ ─▼─ ─ ─ ─┐                   │
     │                │                         │ XYZExchange │                   │
     │                │                         └─ ─ ─ ─ ─ ─ ─┘                   │
     │ Swapper        │                                                           │
     ├────────────────┼───────────────────────────────────────────────────────────┤
     │ OneOracle      │                                                           │
     │               ┌▼────────────────────────────┐                              │
     │               │ ChainlinkAndFallbacksOracle │                              │
     │               └─────────────────────────────┘                              │
     │                                                                            │
     └────────────────────────────────────────────────────────────────────────────┘
```

## Address Provider

The `one-oracle` module counts on an `AddressProvider` contract that makes address changes easier (for instance, when governor address is updated we need to do that in one place only).
The `AddressProvider` must have the same address across all chains where its deployed, to achieve that we're using the [`safe-singleton-factory`](https://github.com/safe-global/safe-singleton-factory) solution that provides a `create2` deployment factory.
In summary we can ensure the same contract address by following the same 1) deployer address, and 2) contracts (proxy + implementation) code.
See more: [https://github.com/bloqpriv/one-oracle/blob/main/helpers/deployment.ts](https://github.com/bloqpriv/one-oracle/blob/main/helpers/deployment.ts)

## Install

```sh
npm i
```

## Setup

Set env vars in `.env` file (use `.env.template` as reference)

## Test

This repo has tests against many EVM networks (e.g. mainnet, polygoin, arbitrum, etc), to run all of them, use:

```sh
npm run test:all
```

To run test related to an specific network, use:

```sh
npm run test:<network>
```

To run code coverage (all networks), use:

```sh
npm run coverage
```

## Deployment

Setup the deployment related env vars properly (See `.env.template` file)

```sh
npm run deploy -- --gasprice <gas price in wei> --network <network>
npm run verify -- --network <network>
```
