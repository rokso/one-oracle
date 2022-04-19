// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "../core/IPriceProvidersAggregator.sol";

interface IOracle is IPriceProvidersAggregator {
    /**
     * @notice Get quote in USD amount
     * @param token_ The address of assetIn
     * @param amountIn_ Amount of input token.
     * @return amountOut_ Amount in USD
     * @return _lastUpdatedAt Last updated timestamp
     */
    function quoteTokenToUsd(address token_, uint256 amountIn_)
        external
        view
        returns (uint256 amountOut_, uint256 _lastUpdatedAt);

    /**
     * @notice Get quote in USD amount
     * @param provider_ The price provider
     * @param token_ The address of assetIn
     * @param amountIn_ Amount of input token.
     * @return amountOut_ Amount in USD
     * @return _lastUpdatedAt Last updated timestamp
     */
    function quoteTokenToUsd(
        Provider provider_,
        address token_,
        uint256 amountIn_
    ) external view returns (uint256 amountOut_, uint256 _lastUpdatedAt);

    /**
     * @notice Get quote from USD amount to amount of token
     * @param token_ The address of assetIn
     * @param amountIn_ Input amount in USD
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
     * @param amountIn_ Input amount in USD
     * @return _amountOut Output amount of token
     * @return _lastUpdatedAt Last updated timestamp
     */
    function quoteUsdToToken(
        Provider provider_,
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
     * @param defaultProvider_ Preferred stable token address
     */
    function setDefaultProvider(Provider defaultProvider_) external;
}
