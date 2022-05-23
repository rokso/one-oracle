// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "../features/UsingStableAsUsd.sol";

contract UsingStableAsUsdMock is UsingStableAsUsd {
    constructor(
        address primaryStableCoin_,
        address secondaryStableCoin_,
        uint256 maxDeviation_,
        uint256 stalePeriod_
    ) UsingStableAsUsd(primaryStableCoin_, secondaryStableCoin_, maxDeviation_, stalePeriod_) {}

    function getStableCoinIfPegged(IPriceProvider priceProvider_) external view returns (address) {
        return _getStableCoinIfPegged(priceProvider_);
    }

    function toUsdRepresentation(uint256 stableCoinAmount_) external view returns (uint256 _usdAmount) {
        return _toUsdRepresentation(stableCoinAmount_);
    }
}
