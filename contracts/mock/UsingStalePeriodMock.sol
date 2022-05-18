// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "../features/UsingStalePeriod.sol";

contract UsingStalePeriodMock is UsingStalePeriod {
    constructor(uint256 stalePeriod_) UsingStalePeriod(stalePeriod_) {}

    function priceIsStale(uint256 timeOfLastUpdate_, uint256 stalePeriod_) external view returns (bool) {
        return _priceIsStale(timeOfLastUpdate_, stalePeriod_);
    }
}
