// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "@openzeppelin/contracts/utils/math/Math.sol";
import "../interfaces/core/IPriceProvidersAggregator.sol";
import "../access/Governable.sol";

/**
 * @title Price Providers Aggregator
 */
contract PriceProvidersAggregator is IPriceProvidersAggregator, Governable {
    /**
     * The native token (usually the most liquid asset in the chain)
     * @dev Is used when getting quote from two price providers
     */
    address public immutable nativeToken;

    /**
     * @notice Price providers map
     */
    mapping(Provider => IPriceProvider) public priceProviders;

    /// Emitted when an price provider is updated
    event PriceProviderUpdated(Provider provider, IPriceProvider oldPriceProvider, IPriceProvider newPriceProvider);

    constructor(address nativeToken_) {
        require(nativeToken_ != address(0), "native-token-is-null");
        nativeToken = nativeToken_;
    }

    /// @inheritdoc IPriceProvidersAggregator
    function quote(
        Provider provider_,
        address tokenIn_,
        address tokenOut_,
        uint256 amountIn_
    ) external view override returns (uint256 _amountOut, uint256 _lastUpdatedAt) {
        return quote(provider_, tokenIn_, provider_, tokenOut_, amountIn_);
    }

    /// @inheritdoc IPriceProvidersAggregator
    function quote(
        Provider providerIn_,
        address tokenIn_,
        Provider providerOut_,
        address tokenOut_,
        uint256 amountIn_
    ) public view override returns (uint256 _amountOut, uint256 _lastUpdatedAt) {
        IPriceProvider _providerIn = priceProviders[providerIn_];
        require(address(_providerIn) != address(0), "provider-in-not-set");

        if (providerIn_ == providerOut_) {
            return _providerIn.quote(tokenIn_, tokenOut_, amountIn_);
        }

        IPriceProvider _providerOut = priceProviders[providerOut_];
        require(address(_providerOut) != address(0), "provider-out-not-set");

        (_amountOut, _lastUpdatedAt) = _providerIn.quote(tokenIn_, nativeToken, amountIn_);
        uint256 __lastUpdatedAt;
        (_amountOut, __lastUpdatedAt) = _providerOut.quote(nativeToken, tokenOut_, _amountOut);
        _lastUpdatedAt = Math.min(__lastUpdatedAt, _lastUpdatedAt);
    }

    /// @inheritdoc IPriceProvidersAggregator
    function setPriceProvider(Provider provider_, IPriceProvider priceProvider_) external onlyGovernor {
        require(provider_ != Provider.NONE, "invalid-provider");
        IPriceProvider _current = priceProviders[provider_];
        require(priceProvider_ != _current, "same-as-current");

        emit PriceProviderUpdated(provider_, _current, priceProvider_);

        priceProviders[provider_] = priceProvider_;
    }
}
