// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "./IPriceProvider.sol";

interface IUniswapV3PriceProvider is IPriceProvider {
    /**
     * @notice The default time-weighted average price (TWAP) period
     * Used when a period isn't specified
     * @dev See more: https://docs.uniswap.org/protocol/concepts/V3-overview/oracle
     */
    function defaultTwapPeriod() external view returns (uint32);

    /**
     * @notice Get USD (or equivalent) price of an asset
     * @param token_ The address of assetIn
     * @param poolFee_ The pools' fees
     * @return _priceInUsd The USD price
     * @return _lastUpdatedAt Last updated timestamp
     */
    function getPriceInUsd(address token_, uint24 poolFee_)
        external
        view
        returns (uint256 _priceInUsd, uint256 _lastUpdatedAt);

    /**
     * @notice Get USD (or equivalent) price of an asset
     * @param token_ The address of assetIn
     * @param twapPeriod_ The TWAP period
     * @return _priceInUsd The USD price
     * @return _lastUpdatedAt Last updated timestamp
     */
    function getPriceInUsd(address token_, uint32 twapPeriod_)
        external
        view
        returns (uint256 _priceInUsd, uint256 _lastUpdatedAt);

    /**
     * @notice Get USD (or equivalent) price of an asset
     * @param token_ The address of assetIn
     * @param poolFee_ The pools' fees
     * @param twapPeriod_ The TWAP period
     * @return _priceInUsd The USD price
     * @return _lastUpdatedAt Last updated timestamp
     */
    function getPriceInUsd(
        address token_,
        uint24 poolFee_,
        uint32 twapPeriod_
    ) external view returns (uint256 _priceInUsd, uint256 _lastUpdatedAt);

    /**
     * @notice Get quote
     * @param tokenIn_ The address of assetIn
     * @param tokenOut_ The address of assetOut
     * @param twapPeriod_ The TWAP period
     * @param amountIn_ Amount of input token
     * @return _amountOut Amount out
     * @return _lastUpdatedAt Last updated timestamp
     */
    function quote(
        address tokenIn_,
        address tokenOut_,
        uint32 twapPeriod_,
        uint256 amountIn_
    ) external view returns (uint256 _amountOut, uint256 _lastUpdatedAt);

    /**
     * @notice Get quote
     * @param tokenIn_ The address of assetIn
     * @param tokenOut_ The address of assetOut
     * @param poolFee_ The pools' fees
     * @param amountIn_ Amount of input token
     * @return _amountOut Amount out
     * @return _lastUpdatedAt Last updated timestamp
     */
    function quote(
        address tokenIn_,
        address tokenOut_,
        uint24 poolFee_,
        uint256 amountIn_
    ) external view returns (uint256 _amountOut, uint256 _lastUpdatedAt);

    /**
     * @notice Get quote
     * @param tokenIn_ The address of assetIn
     * @param tokenOut_ The address of assetOut
     * @param poolFee_ The pools' fees
     * @param twapPeriod_ The TWAP period
     * @param amountIn_ Amount of input token
     * @return _amountOut Amount out
     * @return _lastUpdatedAt Last updated timestamp
     */
    function quote(
        address tokenIn_,
        address tokenOut_,
        uint24 poolFee_,
        uint32 twapPeriod_,
        uint256 amountIn_
    ) external view returns (uint256 _amountOut, uint256 _lastUpdatedAt);

    /**
     * @notice Get quote in USD (or equivalent) amount
     * @param token_ The address of assetIn
     * @param amountIn_ Amount of input token.
     * @return amountOut_ Amount in USD
     * @param poolFee_ The pools' fees
     * @return _lastUpdatedAt Last updated timestamp
     */
    function quoteTokenToUsd(
        address token_,
        uint256 amountIn_,
        uint24 poolFee_
    ) external view returns (uint256 amountOut_, uint256 _lastUpdatedAt);

    /**
     * @notice Get quote in USD (or equivalent) amount
     * @param token_ The address of assetIn
     * @param amountIn_ Amount of input token.
     * @return amountOut_ Amount in USD
     * @param twapPeriod_ The TWAP period
     * @return _lastUpdatedAt Last updated timestamp
     */
    function quoteTokenToUsd(
        address token_,
        uint256 amountIn_,
        uint32 twapPeriod_
    ) external view returns (uint256 amountOut_, uint256 _lastUpdatedAt);

    /**
     * @notice Get quote in USD (or equivalent) amount
     * @param token_ The address of assetIn
     * @param amountIn_ Amount of input token.
     * @return amountOut_ Amount in USD
     * @param poolFee_ The pools' fees
     * @param twapPeriod_ The TWAP period
     * @return _lastUpdatedAt Last updated timestamp
     */
    function quoteTokenToUsd(
        address token_,
        uint256 amountIn_,
        uint24 poolFee_,
        uint32 twapPeriod_
    ) external view returns (uint256 amountOut_, uint256 _lastUpdatedAt);

    /**
     * @notice Get quote from USD (or equivalent) amount to amount of token
     * @param token_ The address of assetIn
     * @param amountIn_ Input amount in USD
     * @param poolFee_ The TWAP period
     * @return _amountOut Output amount of token
     * @return _lastUpdatedAt Last updated timestamp
     */
    function quoteUsdToToken(
        address token_,
        uint256 amountIn_,
        uint24 poolFee_
    ) external view returns (uint256 _amountOut, uint256 _lastUpdatedAt);

    /**
     * @notice Get quote from USD (or equivalent) amount to amount of token
     * @param token_ The address of assetIn
     * @param amountIn_ Input amount in USD
     * @param twapPeriod_ The TWAP period
     * @return _amountOut Output amount of token
     * @return _lastUpdatedAt Last updated timestamp
     */
    function quoteUsdToToken(
        address token_,
        uint256 amountIn_,
        uint32 twapPeriod_
    ) external view returns (uint256 _amountOut, uint256 _lastUpdatedAt);

    /**
     * @notice Get quote from USD (or equivalent) amount to amount of token
     * @param token_ The address of assetIn
     * @param amountIn_ Input amount in USD
     * @param poolFee_ The TWAP period
     * @param twapPeriod_ The TWAP period
     * @return _amountOut Output amount of token
     * @return _lastUpdatedAt Last updated timestamp
     */
    function quoteUsdToToken(
        address token_,
        uint256 amountIn_,
        uint24 poolFee_,
        uint32 twapPeriod_
    ) external view returns (uint256 _amountOut, uint256 _lastUpdatedAt);

    /**
     * @notice Update the default TWAP period
     * @dev Administrative function
     * @param newDefaultTwapPeriod_ The new default period
     */
    function updateDefaultTwapPeriod(uint32 newDefaultTwapPeriod_) external;

    /**
     * @notice Update the default pool fee
     * @dev Administrative function
     * @param newDefaultPoolFee_ The new default period
     */
    function updateDefaultPoolFee(uint24 newDefaultPoolFee_) external;
}
