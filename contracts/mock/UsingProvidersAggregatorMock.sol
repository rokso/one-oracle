// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "../features/UsingProvidersAggregator.sol";

contract UsingProvidersAggregatorMock is UsingProvidersAggregator {
    constructor(IPriceProvidersAggregator providersAggregator_) UsingProvidersAggregator(providersAggregator_) {}
}
