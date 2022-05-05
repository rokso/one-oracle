// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "../../interfaces/core/IChainlinkPriceProvider.sol";
import "../../interfaces/periphery/synth/ISynthOracle.sol";
import "../../access/Governable.sol";

/**
 * @title The default/fallback oracle used by Vesper Synth (i.e. Synth calls this when a specific oracle for the given asset isn't set)
 * @dev This can change later, but for now we only want to use the Chainlink as the main provider for Synth
 * @dev This contract maps synth assets (i.e. vsAssets and vsdAssets) with their underlyings
 */
contract SynthDefaultOracle is ISynthOracle, Governable {
    uint256 public constant ONE_USD = 1e18;

    /**
     * @notice Asset's oracle setup
     * @dev I.e. maps the oracle used by each asset
     */
    struct Asset {
        address underlyingAsset; // the address of the unlderying asset to get prices from
        bool isUsd; // i.e. when true no oracle query is needed (amountOut = amountIn)
        uint256 stalePeriod; // it's used to determine if a price is invalid (i.e. outdated)
    }

    /**
     * @notice The Chainlink provider
     */
    IChainlinkPriceProvider public chainlinkProvider;

    /**
     * @notice Avaliable assets
     */
    mapping(IERC20 => Asset) public assets;

    /// @notice Emitted when asset setup is updated
    event AssetUpdated(IERC20 indexed asset, address underlyingAsset, bool isUsd, uint256 stalePeriod);

    constructor(IChainlinkPriceProvider _chainlinkProvider) {
        chainlinkProvider = _chainlinkProvider;
    }

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
    function addOrUpdateAssetThatUsesChainlink(
        IERC20 _asset,
        address _underlyingAsset,
        uint256 _stalePeriod
    ) external onlyGovernor {
        _addOrUpdateAsset(_asset, _underlyingAsset, false, _stalePeriod);
    }

    /// @inheritdoc ISynthOracle
    function getPriceInUsd(IERC20 _asset) external view returns (uint256 _priceInUsd) {
        Asset memory _assetData = assets[_asset];

        if (_assetData.isUsd) return ONE_USD;

        uint256 _lastUpdatedAt;
        (_priceInUsd, _lastUpdatedAt) = chainlinkProvider.getPriceInUsd(_assetData.underlyingAsset);

        require(_assetData.stalePeriod > block.timestamp - _lastUpdatedAt, "price-is-stale");
    }
}
