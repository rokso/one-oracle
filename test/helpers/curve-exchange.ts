// Array of [initial token, pool, token, pool, token, ...]
export type CurveSwapRoute = [string, string, string, string, string, string, string, string, string]

type CurveSwapParam = [
  // The coin's pool index (aka collateral index) of the "tokenIn"
  idxFrom: number,
  // The coin's pool index (aka collateral index) of the "tokenOut"
  idxTo: number,
  // 1 for a stableswap `exchange`,
  // 2 for stableswap `exchange_underlying`,
  // 3 for a cryptoswap `exchange`,
  // 4 for a cryptoswap `exchange_underlying`,
  // 5 for factory metapools with lending base pool `exchange_underlying`,
  // 6 for factory crypto-meta pools underlying exchange (`exchange` method in zap),
  // 7-11 for wrapped coin (underlying for lending or fake pool) -> LP token "exchange" (actually `add_liquidity`),
  // 12-14 for LP token -> wrapped coin (underlying for lending pool) "exchange" (actually `remove_liquidity_one_coin`)
  // 15 for WETH -> ETH "exchange" (actually deposit/withdraw)
  // Refs:  https://etherscan.deth.net/address/0x99a58482BD75cbab83b27EC03CA68fF489b5788f
  swapType: number
]

export type CurveSwapParams = [CurveSwapParam, CurveSwapParam, CurveSwapParam, CurveSwapParam]
