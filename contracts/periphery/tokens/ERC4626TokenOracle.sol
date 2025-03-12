// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "../../interfaces/periphery/IOracle.sol";
import "../../interfaces/periphery/ITokenOracle.sol";
import "../../interfaces/external/IERC4626.sol";

/**
 * @title Oracle for ERC-4626 token
 */
contract ERC4626TokenOracle is ITokenOracle {
    /// @inheritdoc ITokenOracle
    function getPriceInUsd(address token_) external view override returns (uint256 _priceInUsd) {
        IERC4626 _vault = IERC4626(token_);

        _priceInUsd = IOracle(msg.sender).quoteTokenToUsd(
            _vault.asset(),
            _vault.convertToAssets(10 ** _vault.decimals())
        );
    }
}
