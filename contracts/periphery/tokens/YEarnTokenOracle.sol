// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "../../interfaces/periphery/ITokenOracle.sol";
import "../../interfaces/periphery/IOracle.sol";
import "../../interfaces/external/yearn/IYearn.sol";

/**
 * @title Oracle for Yearn tokens
 */
contract YEarnTokenOracle is ITokenOracle {
    /// @inheritdoc ITokenOracle
    function getPriceInUsd(address token_) external view returns (uint256 _priceInUsd) {
        IYearn _yToken = IYearn(token_);
        uint256 _underlyingPrice = IOracle(msg.sender).getPriceInUsd(_yToken.token());
        return (_yToken.getPricePerFullShare() * _underlyingPrice) / 1e18; // getPricePerFullShare is scaled by 1e18
    }
}
