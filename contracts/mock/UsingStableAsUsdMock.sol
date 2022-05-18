// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "../features/UsingStableAsUsd.sol";

contract UsingStableAsUsdMock is UsingStableAsUsd {
    constructor(address stableCoin_) UsingStableAsUsd(stableCoin_) {}
}
