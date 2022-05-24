// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "../core/PriceProvider.sol";

contract PriceProviderMock is PriceProvider {
    uint256 public priceInUsd;
    uint256 public lastUpdatedAt;

    function setPriceInUsd(uint256 priceInUsd_, uint256 lastUpdatedAt_) public {
        priceInUsd = priceInUsd_;
        lastUpdatedAt = lastUpdatedAt_;
    }

    function getPriceInUsd(address) public view override returns (uint256 _priceInUsd, uint256 _lastUpdatedAt) {
        _priceInUsd = priceInUsd;
        _lastUpdatedAt = lastUpdatedAt;
    }

    function quote(
        address,
        address,
        uint256
    ) external pure returns (uint256, uint256) {
        revert("not-implemented");
    }
}
