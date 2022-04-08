// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

interface IPriceProvidersAggregator {
    enum Provider {
        NONE,
        UNISWAP_V3,
        UNISWAP_V2,
        CHAINLINK,
        SUSHISWAP,
        TRADERJOE
    }

    function setPriceProvider(Provider _provider, address _priceProvider) external;

    function quote(
        address _tokenIn,
        Provider _providerIn,
        address _tokenOut,
        Provider _providerOut,
        uint256 _amountIn
    ) external view returns (uint256 _amountOut, uint256 _lastUpdatedAt);
}
