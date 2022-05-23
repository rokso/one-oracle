// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "../interfaces/core/IChainlinkPriceProvider.sol";
import "../interfaces/core/IPriceProvider.sol";
import "../interfaces/periphery/IOracle.sol";
import "./ChainlinkAndFallbacksOracle.sol";

/**
 * @title The Synth Oracle
 * @dev Extends `ChainlinkAndFallbacksOracle` contract
 * @dev This contract maps synth assets (i.e. vsAssets and vsdAssets) with their underlying
 */
contract SynthOracle is ChainlinkAndFallbacksOracle {
    uint256 public constant ONE_USD = 1e18;

    /**
     * @notice Asset's oracle setup
     * @dev I.e. maps the oracle used by each asset
     */
    struct Asset {
        address underlyingAsset; // the address of the underlying asset to get prices from
        bool isUsd; // i.e. when true no oracle query is needed (amountOut = amountIn)
    }

    /**
     * @notice Available assets
     */
    mapping(address => Asset) public assets;

    /// @notice Emitted when asset setup is updated
    event AssetUpdated(address indexed asset, address underlyingAsset, bool isUsd);

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
        address _asset,
        address _underlyingAsset,
        bool _isUsd
    ) private {
        require(address(_asset) != address(0), "asset-address-is-null");
        assets[_asset] = Asset({underlyingAsset: _underlyingAsset, isUsd: _isUsd});
        emit AssetUpdated(_asset, _underlyingAsset, _isUsd);
    }

    /**
     * @notice Store an USD asset (no protocol)
     * @param _asset The asset to store
     */
    function addOrUpdateUsdAsset(address _asset) external onlyGovernor {
        _addOrUpdateAsset(_asset, address(0), true);
    }

    /**
     * @notice Store an asset that uses Chainlink source of price
     * @param _asset The asset to store
     * @param _underlyingAsset The asset's chainlink aggregator contract
     */
    function addOrUpdateAsset(address _asset, address _underlyingAsset) external onlyGovernor {
        _addOrUpdateAsset(_asset, _underlyingAsset, false);
    }

    /// @inheritdoc IOracle
    function getPriceInUsd(address _asset) public view override returns (uint256 _priceInUsd) {
        Asset memory _assetData = assets[_asset];

        if (_assetData.isUsd) return ONE_USD;

        return super.getPriceInUsd(_assetData.underlyingAsset);
    }

    /// @inheritdoc IOracle
    function quote(
        address tokenIn_,
        address tokenOut_,
        uint256 amountIn_
    ) public view override returns (uint256 _amountOut) {
        Asset memory _assetInData = assets[tokenIn_];
        Asset memory _assetOutData = assets[tokenOut_];

        if (_assetInData.isUsd && _assetOutData.isUsd) {
            return amountIn_;
        } else if (_assetInData.isUsd) {
            return super.quoteUsdToToken(_assetOutData.underlyingAsset, amountIn_);
        } else if (_assetOutData.isUsd) {
            return super.quoteTokenToUsd(_assetInData.underlyingAsset, amountIn_);
        }

        return super.quote(_assetInData.underlyingAsset, _assetOutData.underlyingAsset, amountIn_);
    }

    /// @inheritdoc IOracle
    function quoteTokenToUsd(address _asset, uint256 amountIn_) public view override returns (uint256 _amountOut) {
        Asset memory _assetData = assets[_asset];

        if (_assetData.isUsd) {
            return amountIn_;
        }

        return super.quoteTokenToUsd(_assetData.underlyingAsset, amountIn_);
    }

    /// @inheritdoc IOracle
    function quoteUsdToToken(address _asset, uint256 amountIn_) public view override returns (uint256 _amountOut) {
        Asset memory _assetData = assets[_asset];

        if (_assetData.isUsd) {
            return amountIn_;
        }

        return super.quoteUsdToToken(_assetData.underlyingAsset, amountIn_);
    }
}
