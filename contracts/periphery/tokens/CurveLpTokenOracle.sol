// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "../../interfaces/periphery/IUSDOracle.sol";
import "../../interfaces/external/ICurveAddressProvider.sol";

/**
 * @title Oracle for Curve LP tokens
 */
contract CurveLpTokenOracle is IUSDOracle {
    ICurveAddressProvider public addressProvider;

    constructor(ICurveAddressProvider _addressProvider) {
        addressProvider = _addressProvider;
    }

    /// @inheritdoc IUSDOracle
    function getPriceInUsd(IERC20 _asset) external view returns (uint256 _priceInUsd) {
        return addressProvider.get_registry().get_virtual_price_from_lp_token(address(_asset));
    }
}
