// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "../access/Governable.sol";

/**
 * @title Stable coin as USD feature - useful for getting USD prices reference from DEXes
 * @dev Stable coin may lose pegging on-chain and may not be equal to $1
 */
contract UsingStableAsUsd is Governable {
    uint256 public constant USD_DECIMALS = 18;

    /**
     * @notice A stable coin to use as USD price reference
     */
    address public stableCoin;
    uint8 internal stableCoinDecimals;

    /// @notice Emitted when stable coin is updated
    event StableCoinUpdated(address oldUsdToken, address newUsdToken);

    constructor(address stableCoin_) {
        _updateStableCoin(stableCoin_);
    }

    /**
     * @notice Update stable coin
     */
    function updateStableCoin(address stableCoin_) external onlyGovernor {
        _updateStableCoin(stableCoin_);
    }

    function _updateStableCoin(address stableCoin_) private {
        require(stableCoin_ != address(0), "address-is-null");
        emit StableCoinUpdated(stableCoin, stableCoin_);
        stableCoin = stableCoin_;
        stableCoinDecimals = IERC20Metadata(stableCoin_).decimals();
    }
}
