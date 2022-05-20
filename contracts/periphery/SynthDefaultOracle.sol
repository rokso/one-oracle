// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "../interfaces/core/IChainlinkPriceProvider.sol";
import "../interfaces/core/IPriceProvider.sol";
import "../interfaces/periphery/IUSDOracle.sol";
import "./ChainlinkAndFallbacksOracle.sol";

/**
 * @title The Synth Oracle
 * @dev Extends `ChainlinkAndFallbacksOracle` contract
 * @dev This contract maps synth assets (i.e. vsAssets and vsdAssets) with their underlying
 */
contract SynthDefaultOracle is IUSDOracle, ChainlinkAndFallbacksOracle {
    uint256 public constant ONE_USD = 1e18;

    /**
     * @notice Asset's oracle setup
     * @dev I.e. maps the oracle used by each asset
     */
    struct Asset {
        address underlyingAsset; // the address of the underlying asset to get prices from
        bool isUsd; // i.e. when true no oracle query is needed (amountOut = amountIn)
        uint256 stalePeriod; // it's used to determine if a price is invalid (i.e. outdated)
    }

    /**
     * @notice Available assets
     */
    mapping(IERC20 => Asset) public assets;

    /// @notice Emitted when asset setup is updated
    event AssetUpdated(IERC20 indexed asset, address underlyingAsset, bool isUsd, uint256 stalePeriod);

    constructor(
        IPriceProvidersAggregator providersAggregator_,
        uint256 maxDeviation_,
        uint256 stalePeriod_,
        DataTypes.Provider fallbackProviderA_,
        DataTypes.Provider fallbackProviderB_
    )
        ChainlinkAndFallbacksOracle(
            providersAggregator_,
            maxDeviation_,
            stalePeriod_,
            fallbackProviderA_,
            fallbackProviderB_
        )
    {}

    /**
     * @notice Store an asset
     * @param _asset The asset to store
     * @param _underlyingAsset The asset's encoded data
     * @param _isUsd If the asset is a USD token coin
     */
    function _addOrUpdateAsset(
        IERC20 _asset,
        address _underlyingAsset,
        bool _isUsd,
        uint256 _stalePeriod
    ) private {
        require(address(_asset) != address(0), "asset-address-is-null");
        assets[_asset] = Asset({underlyingAsset: _underlyingAsset, isUsd: _isUsd, stalePeriod: _stalePeriod});
        emit AssetUpdated(_asset, _underlyingAsset, _isUsd, _stalePeriod);
    }

    /**
     * @notice Store an USD asset (no protocol)
     * @param _asset The asset to store
     */
    function addOrUpdateUsdAsset(IERC20 _asset) external onlyGovernor {
        _addOrUpdateAsset(_asset, address(0), true, type(uint256).max);
    }

    /**
     * @notice Store an asset that uses Chainlink source of price
     * @param _asset The asset to store
     * @param _underlyingAsset The asset's chainlink aggregator contract
     * @param _stalePeriod The stale period
     */
    function addOrUpdateAsset(
        IERC20 _asset,
        address _underlyingAsset,
        uint256 _stalePeriod
    ) external onlyGovernor {
        _addOrUpdateAsset(_asset, _underlyingAsset, false, _stalePeriod);
    }

    /// @inheritdoc IUSDOracle
    function getPriceInUsd(IERC20 _asset) external view returns (uint256 _priceInUsd) {
        Asset memory _assetData = assets[_asset];

        if (_assetData.isUsd) return ONE_USD;

        // 1. Get price from chainlink
        uint256 _lastUpdatedAt;
        (_priceInUsd, _lastUpdatedAt) = _getPriceInUsd(DataTypes.Provider.CHAINLINK, _assetData.underlyingAsset);

        // 2. If price from chainlink is OK return it
        if (_priceInUsd > 0 && !_priceIsStale(_lastUpdatedAt, _assetData.stalePeriod)) {
            return _priceInUsd;
        }

        // 3. Get price from fallback A
        (uint256 _amountOutA, uint256 _lastUpdatedAtA) = _getPriceInUsd(fallbackProviderA, _assetData.underlyingAsset);

        // 4. If price from fallback A is OK and there isn't a fallback B, return price from fallback A
        bool _aPriceOK = _amountOutA > 0 && !_priceIsStale(_lastUpdatedAtA, _assetData.stalePeriod);
        if (fallbackProviderB == DataTypes.Provider.NONE) {
            require(_aPriceOK, "fallback-a-failed");
            return _amountOutA;
        }

        // 5. Get price from fallback B
        (uint256 _amountOutB, uint256 _lastUpdatedAtB) = _getPriceInUsd(fallbackProviderB, _assetData.underlyingAsset);

        // 6. If only one price from fallbacks is valid, return it
        bool _bPriceOK = _amountOutB > 0 && !_priceIsStale(_lastUpdatedAtB, _assetData.stalePeriod);
        if (!_bPriceOK && _aPriceOK) {
            return _amountOutA;
        } else if (_bPriceOK && !_aPriceOK) {
            return _amountOutB;
        }

        // 7. Check fallback prices deviation
        require(_aPriceOK && _bPriceOK, "fallbacks-failed");
        require(_isDeviationOK(_amountOutA, _amountOutB), "prices-deviation-too-high");

        // 8. If deviation is OK, return price from fallback A
        return _amountOutA;
    }

    /**
     * @notice Wrapped `getPriceInUsd` function
     * @dev Return [0,0] (i.e. invalid quote) if the call reverts
     */
    function _getPriceInUsd(DataTypes.Provider provider_, address token_)
        private
        view
        returns (uint256 _priceInUsd, uint256 _lastUpdatedAt)
    {
        try providersAggregator.priceProviders(provider_).getPriceInUsd(token_) returns (
            uint256 __priceInUsd,
            uint256 __lastUpdatedAt
        ) {
            _priceInUsd = __priceInUsd;
            _lastUpdatedAt = __lastUpdatedAt;
        } catch {}
    }
}
