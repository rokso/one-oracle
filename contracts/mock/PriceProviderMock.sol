// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "../core/PriceProvider.sol";

contract PriceProviderMock is PriceProvider {
    mapping(address => uint256) public priceInUsd;

    function setPriceInUsd(address token_, uint256 priceInUsd_) public {
        priceInUsd[token_] = priceInUsd_;
    }

    function getPriceInUsd(address token_) public view override returns (uint256 _priceInUsd, uint256 _lastUpdatedAt) {
        _priceInUsd = priceInUsd[token_];
        _lastUpdatedAt = block.timestamp;
    }

    function checkGasOfQuote(
        IPriceProvider _pp,
        address tokenIn_,
        address tokenOut_,
        uint256 amountIn_
    ) public returns (uint256 _amountOut, uint256 _lastUpdatedAt) {
        return _pp.quote(tokenIn_, tokenOut_, amountIn_);
    }
}
