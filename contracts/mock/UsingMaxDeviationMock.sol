// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "../features/UsingMaxDeviation.sol";

contract UsingMaxDeviationMock is UsingMaxDeviation {
    constructor(uint256 maxDeviation_) UsingMaxDeviation(maxDeviation_) {}

    function isDeviationOK(uint256 a_, uint256 b_) external view returns (bool) {
        return _isDeviationOK(a_, b_);
    }
}
