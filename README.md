# One Oracle

The `one-oracle` repository has two modules, the `OneOracle` and the `Swapper`.

1. The `OneOracle` has a set of contracts that implement price oracles from different sources (e.g. Chainlink, UniswapV2, UniswapV3, etc). This module has two layers: `core` and `periphery`: the `core` contains the base ground with well flexible interfaces that can be easily reused. The `periphery` layer has oracle contracts built on top of the `core`. Any external project that needs an oracle, can interact with one of the periphery contracts or implement a new custom periphery contract if needed.

2. The `Swapper` module encapsulates token swap logic by looking for the best swap path among available DEXes and interacts with `ChainlinkAndFallbacksOracle` (from `OneOracle/periphery`) for slippage check.

## Setup

1. Install

   ```sh
   npm i
   ```

2. Set env vars in `.env` file (use `.env.template` as reference)

3. Test

```sh
npm t
```

## Run test with coverage

```sh
npm run coverage
```
