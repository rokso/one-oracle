// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "../features/UsingStableCoinProvider.sol";

contract UsingStableCoinProviderMock is UsingStableCoinProvider {
    constructor(IStableCoinProvider stableCoinProvider_) UsingStableCoinProvider(stableCoinProvider_) {}
}
