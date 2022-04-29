// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "../../libraries/DataTypes.sol";
import "../core/IPriceProvidersAggregator.sol";

interface IOracle {
    /**
     * @notice Get quote
     * @param provider_ The price provider to get quote from
     * @param tokenIn_ The address of assetIn
     * @param tokenOut_ The address of assetOut
     * @param amountIn_ Amount of input token
     * @return _amountOut Amount out
     * @return _lastUpdatedAt Last updated timestamp
     */
    function quote(
        DataTypes.Provider provider_,
        address tokenIn_,
        address tokenOut_,
        uint256 amountIn_
    ) external view returns (uint256 _amountOut, uint256 _lastUpdatedAt);

    /**
     * @notice Get quote
     * @dev If providers aren't the same, uses native token as "bridge"
     * @param providerIn_ The price provider to get quote for the tokenIn
     * @param tokenIn_ The address of assetIn
     * @param providerOut_ The price provider to get quote for the tokenOut
     * @param tokenOut_ The address of assetOut
     * @param amountIn_ Amount of input token
     * @return _amountOut Amount out
     * @return _lastUpdatedAt Last updated timestamp
     */
    function quote(
        DataTypes.Provider providerIn_,
        address tokenIn_,
        DataTypes.Provider providerOut_,
        address tokenOut_,
        uint256 amountIn_
    ) external view returns (uint256 _amountOut, uint256 _lastUpdatedAt);

    /**
     * @notice Get quote in USD amount
     * @param token_ The address of assetIn
     * @param amountIn_ Amount of input token.
     * @return _amountOut Amount in USD (18-decimals)
     * @return _lastUpdatedAt Last updated timestamp
     */
    function quoteTokenToUsd(address token_, uint256 amountIn_)
        external
        view
        returns (uint256 _amountOut, uint256 _lastUpdatedAt);

    /**
     * @notice Get quote in USD amount
     * @param provider_ The price provider
     * @param token_ The address of assetIn
     * @param amountIn_ Amount of input token.
     * @return _amountOut Amount in USD (18-decimals)
     * @return _lastUpdatedAt Last updated timestamp
     */
    function quoteTokenToUsd(
        DataTypes.Provider provider_,
        address token_,
        uint256 amountIn_
    ) external view returns (uint256 _amountOut, uint256 _lastUpdatedAt);

    /**
     * @notice Get quote from USD amount to amount of token
     * @param token_ The address of assetIn
     * @param amountIn_ Input amount in USD (18-decimals)
     * @return _amountOut Output amount of token
     * @return _lastUpdatedAt Last updated timestamp
     */
    function quoteUsdToToken(address token_, uint256 amountIn_)
        external
        view
        returns (uint256 _amountOut, uint256 _lastUpdatedAt);

    /**
     * @notice Get quote from USD amount to amount of token
     * @param provider_ The price provider
     * @param token_ The address of assetIn
     * @param amountIn_ Input amount in USD (18-decimals)
     * @return _amountOut Output amount of token
     * @return _lastUpdatedAt Last updated timestamp
     */
    function quoteUsdToToken(
        DataTypes.Provider provider_,
        address token_,
        uint256 amountIn_
    ) external view returns (uint256 _amountOut, uint256 _lastUpdatedAt);

    /**
     * @notice For Dex price provider, we may want to use stable token as USD token to get price in USD.
     * @dev Allow to set 0x0 in case we don't want to support USD price from UniV2 and UniV3.
     * @param usdEquivalentToken_ Preferred stable token address
     */
    function setUSDEquivalentToken(address usdEquivalentToken_) external;

    /**
     * @notice Update the default provider
     * @dev Allow to set 0x0
     * @param defaultProvider_ The default provider to get price for `usdEquivalentToken`
     */
    function setDefaultProvider(DataTypes.Provider defaultProvider_) external;

    /**
     * @notice Update providers aggregator
     * @param providersAggregator_ The providers aggregator contract
     */
    function updateProvidersAggregator(IPriceProvidersAggregator providersAggregator_) external;
}
