// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "../libraries/OracleHelpers.sol";
import "../interfaces/core/IPriceProvider.sol";
import "./UsingMaxDeviation.sol";
import "./UsingStalePeriod.sol";

/**
 * @title Stable coin as USD feature - useful for getting USD prices reference from DEXes
 * @dev Stable coin may lose pegging on-chain and may not be equal to $1
 */
abstract contract UsingStableAsUsd is UsingMaxDeviation, UsingStalePeriod {
    using OracleHelpers for uint256;

    uint256 public constant USD_DECIMALS = 18;

    /**
     * @notice A stable coin to use as USD price reference
     */
    address private __primaryStableCoin;
    uint8 private __primaryStableCoinDecimals;

    /**
     * @notice A secondary stable coin used to check USD-peg against primary
     */
    address private __secondaryStableCoin;
    uint8 private __secondaryStableCoinDecimals;

    /// @notice Emitted when stable coin is updated
    event StableCoinsUpdated(
        address oldPrimaryStableCoin,
        address oldSecondaryStableCoin,
        address newPrimaryStableCoin,
        address newSecondaryStableCoin
    );

    constructor(
        address primaryStableCoin_,
        address secondaryStableCoin_,
        uint256 maxDeviation_,
        uint256 stalePeriod_
    ) UsingMaxDeviation(maxDeviation_) UsingStalePeriod(stalePeriod_) {
        _updateStableCoins(primaryStableCoin_, secondaryStableCoin_);
    }

    /**
     * @notice Return the primary stable coin
     * @dev Should not be called internally, must use `getStableCoinIfPegged`
     */
    function primaryStableCoin() external view returns (address) {
        return __primaryStableCoin;
    }

    /**
     * @notice Return the secondary stable coin
     * @dev Should not be called internally, must use `getStableCoinIfPegged`
     */
    function secondaryStableCoin() external view returns (address) {
        return __secondaryStableCoin;
    }

    /**
     * @notice Return the stable coin if pegged
     * @dev Check price relation between both stable coins and revert if peg is too loose
     */
    function _getStableCoinIfPegged(IPriceProvider priceProvider_) internal view returns (address) {
        require(__primaryStableCoin != address(0), "stable-coin-not-supported");
        uint256 _amountIn = 10**__primaryStableCoinDecimals;
        (uint256 _amountOut, uint256 _lastUpdatedAt) = priceProvider_.quote(
            __primaryStableCoin,
            __secondaryStableCoin,
            _amountIn
        );
        require(_amountOut > 0 && !_priceIsStale(_lastUpdatedAt), "stable-prices-invalid");
        if (__primaryStableCoinDecimals == __secondaryStableCoinDecimals) {
            require(_isDeviationOK(_amountIn, _amountOut), "stable-coins-deviation-too-high");
        } else {
            require(
                _isDeviationOK(
                    _amountIn,
                    _amountOut.scaleDecimal(__secondaryStableCoinDecimals, __primaryStableCoinDecimals)
                ),
                "stable-coins-deviation-too-high"
            );
        }
        return __primaryStableCoin;
    }

    /**
     * @notice Convert given amount of stable coin to USD representation (18 decimals)
     */
    function _toUsdRepresentation(uint256 stableCoinAmount_) internal view returns (uint256 _usdAmount) {
        uint256 _stableCoinDecimals = __primaryStableCoinDecimals;
        if (_stableCoinDecimals == USD_DECIMALS) {
            return stableCoinAmount_;
        }
        _usdAmount = stableCoinAmount_.scaleDecimal(_stableCoinDecimals, USD_DECIMALS);
    }

    /**
     * @notice Update the stable coin keeping correct decimals value
     * @dev Must have both as set or null
     */
    function _updateStableCoins(address primaryStableCoin_, address secondaryStableCoin_) private {
        require(
            (address(primaryStableCoin_) == address(0) && address(secondaryStableCoin_) == address(0)) ||
                (address(primaryStableCoin_) != address(0) && address(secondaryStableCoin_) != address(0)),
            "must-set-or-remove-both"
        );

        // Update both
        __primaryStableCoin = primaryStableCoin_;
        __secondaryStableCoin = secondaryStableCoin_;

        // Set decimals
        if (primaryStableCoin_ == address(0)) {
            __primaryStableCoinDecimals = 0;
            __secondaryStableCoinDecimals = 0;
        } else {
            __primaryStableCoinDecimals = IERC20Metadata(primaryStableCoin_).decimals();
            __secondaryStableCoinDecimals = IERC20Metadata(secondaryStableCoin_).decimals();
        }
    }

    /**
     * @notice Update stable coin
     * @dev Used externally by the governor
     */
    function updateStableCoins(address primaryStableCoin_, address secondaryStableCoin_) external onlyGovernor {
        emit StableCoinsUpdated(__primaryStableCoin, __secondaryStableCoin, primaryStableCoin_, secondaryStableCoin_);
        _updateStableCoins(primaryStableCoin_, secondaryStableCoin_);
    }
}
