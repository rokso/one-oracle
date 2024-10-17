// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import {IOracle} from "../interfaces/periphery/IOracle.sol";
import {IPriceProvider} from "../interfaces/core/IPriceProvider.sol";
import {UsingStalePeriod} from "../features/UsingStalePeriod.sol";

/**
 * @title Main and Fallback oracle
 * @dev Uses a primary oracle, if it doesn't support the asset, or price is staled, try getting price from the fallback.
 */
contract MainAndFallbackOracle is IOracle, UsingStalePeriod {
    IPriceProvider public immutable mainProvider;
    IPriceProvider public immutable fallbackProvider;

    constructor(
        IPriceProvider mainProvider_,
        IPriceProvider fallbackProvider_,
        uint256 stalePeriod_
    ) UsingStalePeriod(stalePeriod_) {
        require(address(mainProvider_) != address(0), "main-is-null");
        require(address(fallbackProvider_) != address(0), "fallback-is-null");
        mainProvider = mainProvider_;
        fallbackProvider = fallbackProvider_;
    }

    /// @inheritdoc IOracle
    function getPriceInUsd(address _asset) public view virtual returns (uint256) {
        uint256 _stalePeriod = stalePeriodOf(_asset);

        // 1. Check main provider
        (uint256 _priceInUsd, uint256 _lastUpdatedAt) = mainProvider.getPriceInUsd(_asset);

        if (_priceInUsd > 0 && !_priceIsStale(_lastUpdatedAt, _stalePeriod)) {
            return _priceInUsd;
        }

        // 2. Check fallback provider
        (_priceInUsd, _lastUpdatedAt) = fallbackProvider.getPriceInUsd(_asset);

        if (_priceInUsd > 0 && !_priceIsStale(_lastUpdatedAt, _stalePeriod)) {
            return _priceInUsd;
        }

        revert("both-providers-failed");
    }

    /// @inheritdoc IOracle
    function quote(address tokenIn_, address tokenOut_, uint256 amountIn_) public view virtual returns (uint256) {
        uint256 _inStalePeriod = stalePeriodOf(tokenIn_);
        uint256 _outStalePeriod = stalePeriodOf(tokenOut_);

        // 1. Check main provider
        (uint256 _amountOut, uint256 _inUpdatedAt, uint256 _outUpdatedAt) = mainProvider.quote(
            tokenIn_,
            tokenOut_,
            amountIn_
        );

        if (
            _amountOut > 0 &&
            !_priceIsStale(_inUpdatedAt, _inStalePeriod) &&
            !_priceIsStale(_outUpdatedAt, _outStalePeriod)
        ) {
            return _amountOut;
        }

        // 2. Check fallback provider
        (_amountOut, _inUpdatedAt, _outUpdatedAt) = fallbackProvider.quote(tokenIn_, tokenOut_, amountIn_);

        if (
            _amountOut > 0 &&
            !_priceIsStale(_inUpdatedAt, _inStalePeriod) &&
            !_priceIsStale(_outUpdatedAt, _outStalePeriod)
        ) {
            return _amountOut;
        }

        revert("both-providers-failed");
    }

    /// @inheritdoc IOracle
    function quoteTokenToUsd(address token_, uint256 amountIn_) public view virtual returns (uint256) {
        uint256 _stalePeriod = stalePeriodOf(token_);

        // 1. Check main provider
        (uint256 _amountOut, uint256 _lastUpdatedAt) = mainProvider.quoteTokenToUsd(token_, amountIn_);

        if (_amountOut > 0 && !_priceIsStale(_lastUpdatedAt, _stalePeriod)) {
            return _amountOut;
        }

        // 2. Check fallback provider
        (_amountOut, _lastUpdatedAt) = fallbackProvider.quoteTokenToUsd(token_, amountIn_);

        if (_amountOut > 0 && !_priceIsStale(_lastUpdatedAt, _stalePeriod)) {
            return _amountOut;
        }

        revert("both-providers-failed");
    }

    /// @inheritdoc IOracle
    function quoteUsdToToken(address token_, uint256 amountIn_) public view virtual returns (uint256) {
        uint256 _stalePeriod = stalePeriodOf(token_);

        // 1. Check main provider
        (uint256 _amountOut, uint256 _lastUpdatedAt) = mainProvider.quoteUsdToToken(token_, amountIn_);

        if (_amountOut > 0 && !_priceIsStale(_lastUpdatedAt, _stalePeriod)) {
            return _amountOut;
        }

        // 2. Check fallback provider
        (_amountOut, _lastUpdatedAt) = fallbackProvider.quoteUsdToToken(token_, amountIn_);

        if (_amountOut > 0 && !_priceIsStale(_lastUpdatedAt, _stalePeriod)) {
            return _amountOut;
        }

        revert("both-providers-failed");
    }
}
