// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "./IPriceProvider.sol";

interface IPriceProvidersAggregator {
    /**
     * @notice Price providers enumeration
     */
    enum Provider {
        NONE,
        CHAINLINK,
        UNISWAP_V3,
        UNISWAP_V2,
        SUSHISWAP,
        TRADERJOE,
        PANGOLIN,
        QUICKSWAP
    }

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
        Provider provider_,
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
        Provider providerIn_,
        address tokenIn_,
        Provider providerOut_,
        address tokenOut_,
        uint256 amountIn_
    ) external view returns (uint256 _amountOut, uint256 _lastUpdatedAt);

    /**
     * @notice Set a price provider
     * @dev Administrative function
     * @param provider_ The provider (from enum)
     * @param priceProvider_ The price provider contract
     */
    function setPriceProvider(Provider provider_, IPriceProvider priceProvider_) external;
}
