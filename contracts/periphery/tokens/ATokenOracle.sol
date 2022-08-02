// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "../../interfaces/external/aave/IAToken.sol";
import "../../interfaces/periphery/IOracle.sol";
import "../../interfaces/periphery/ITokenOracle.sol";

/**
 * @title Oracle for `ATokens`
 */
contract ATokenOracle is ITokenOracle {
    /// @inheritdoc ITokenOracle
    function getPriceInUsd(address _asset) external view returns (uint256 _priceInUsd) {
        // Note: `msg.sender` is the `MasterOracle` contract
        return IOracle(msg.sender).getPriceInUsd(IAToken(_asset).UNDERLYING_ASSET_ADDRESS());
    }
}
