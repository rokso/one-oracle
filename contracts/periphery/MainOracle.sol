// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import {IOracle} from "../interfaces/periphery/IOracle.sol";
import {IPriceProvider} from "../interfaces/core/IPriceProvider.sol";
import {UsingStalePeriod} from "../features/UsingStalePeriod.sol";

/**
 * @title Main oracle
 * @dev In most cases this will wrap the Chainlink price provider
 */
contract MainOracle is IOracle, UsingStalePeriod {
    IPriceProvider public immutable provider;

    constructor(IPriceProvider provider_, uint256 stalePeriod_) UsingStalePeriod(stalePeriod_) {
        provider = provider_;
    }

    /// @inheritdoc IOracle
    function getPriceInUsd(address token_) public view virtual returns (uint256 _priceInUsd) {
        uint256 _lastUpdatedAt;
        (_priceInUsd, _lastUpdatedAt) = provider.getPriceInUsd(token_);
        require(_priceInUsd > 0 && !_priceIsStale(token_, _lastUpdatedAt), "price-invalid");
    }

    /// @inheritdoc IOracle
    function quote(
        address tokenIn_,
        address tokenOut_,
        uint256 amountIn_
    ) public view virtual returns (uint256 _amountOut) {
        uint256 _tokenInLastUpdatedAt;
        uint256 _tokenOutLastUpdatedAt;
        (_amountOut, _tokenInLastUpdatedAt, _tokenOutLastUpdatedAt) = provider.quote(tokenIn_, tokenOut_, amountIn_);

        require(
            _amountOut > 0 &&
                !_priceIsStale(tokenIn_, _tokenInLastUpdatedAt) &&
                !_priceIsStale(tokenOut_, _tokenOutLastUpdatedAt),
            "price-invalid"
        );
    }

    /// @inheritdoc IOracle
    function quoteTokenToUsd(address token_, uint256 amountIn_) public view virtual returns (uint256 _amountOut) {
        uint256 _lastUpdatedAt;
        (_amountOut, _lastUpdatedAt) = provider.quoteTokenToUsd(token_, amountIn_);
        require(_amountOut > 0 && !_priceIsStale(token_, _lastUpdatedAt), "price-invalid");
    }

    /// @inheritdoc IOracle
    function quoteUsdToToken(address token_, uint256 amountIn_) public view virtual returns (uint256 _amountOut) {
        uint256 _lastUpdatedAt;
        (_amountOut, _lastUpdatedAt) = provider.quoteUsdToToken(token_, amountIn_);
        require(_amountOut > 0 && !_priceIsStale(token_, _lastUpdatedAt), "price-invalid");
    }
}
