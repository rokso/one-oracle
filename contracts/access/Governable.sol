// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "../core/AddressProvider.sol";

/**
 * @notice Contract module which provides access control mechanism, where
 * the governor account is granted with exclusive access to specific functions.
 * @dev Uses the AddressProvider to get the governor
 */
abstract contract Governable {
    /// @notice Address that's used as governor while `addressProvider` is initialized
    address private deployer;

    /// @notice AddressProvider contract
    IAddressProvider public addressProvider;

    /// @notice Emitted when AddressProvider is updated
    event AddressProviderUpdated(IAddressProvider oldAddressProvider, IAddressProvider newAddressProvider);

    constructor() {
        deployer = msg.sender;
    }

    /// @dev Throws if called by any account other than the governor.
    modifier onlyGovernor() {
        IAddressProvider _addressProvider = addressProvider;
        if (address(_addressProvider) != address(0)) {
            require(msg.sender == _addressProvider.governor(), "not-governor");
        } else {
            require(msg.sender == deployer, "not-governor");
        }
        _;
    }

    /// @notice Updates the AddressProvider contract
    function updateAddressProvider(IAddressProvider addressProvider_) external onlyGovernor {
        require(address(addressProvider_) != address(0), "address-provider-is-null");
        emit AddressProviderUpdated(addressProvider, addressProvider_);
        addressProvider = addressProvider_;
    }
}
