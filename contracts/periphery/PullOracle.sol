// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import {IOracle} from "../interfaces/periphery/IOracle.sol";
import {IPriceProvider} from "../interfaces/core/IPriceProvider.sol";

/**
 * @title Pull oracle
 * @dev This is the same as `MainOracle` but without stale period check because pull-oracle providers already do that
 */
contract PullOracle is IOracle {
    IPriceProvider public immutable provider;

    constructor(IPriceProvider provider_) {
        provider = provider_;
    }

    /// @inheritdoc IOracle
    function getPriceInUsd(address token_) public view virtual returns (uint256 _priceInUsd) {
        (_priceInUsd, ) = provider.getPriceInUsd(token_);
    }

    /// @inheritdoc IOracle
    function quote(
        address tokenIn_,
        address tokenOut_,
        uint256 amountIn_
    ) public view virtual returns (uint256 _amountOut) {
        (_amountOut, , ) = provider.quote(tokenIn_, tokenOut_, amountIn_);
    }

    /// @inheritdoc IOracle
    function quoteTokenToUsd(address token_, uint256 amountIn_) public view virtual returns (uint256 _amountOut) {
        (_amountOut, ) = provider.quoteTokenToUsd(token_, amountIn_);
    }

    /// @inheritdoc IOracle
    function quoteUsdToToken(address token_, uint256 amountIn_) public view virtual returns (uint256 _amountOut) {
        (_amountOut, ) = provider.quoteUsdToToken(token_, amountIn_);
    }
}
