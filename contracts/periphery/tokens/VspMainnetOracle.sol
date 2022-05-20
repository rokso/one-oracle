// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "@openzeppelin/contracts/utils/math/Math.sol";
import "../../features/UsingProvidersAggregator.sol";
import "../../features/UsingMaxDeviation.sol";
import "../../features/UsingStableAsUsd.sol";
import "../../features/UsingStalePeriod.sol";
import "../../interfaces/periphery/IUSDOracle.sol";

/**
 * @title Main oracle
 * @dev Reuses `PriceProvidersAggregator` and add support to USD quotes
 */
contract VspMainnetOracle is
    IUSDOracle,
    UsingProvidersAggregator,
    UsingMaxDeviation,
    UsingStableAsUsd,
    UsingStalePeriod
{
    uint256 public constant ONE_VSP = 1e18;
    address public constant VSP_ADDRESS = 0x1b40183EFB4Dd766f11bDa7A7c3AD8982e998421;

    constructor(
        IPriceProvidersAggregator providersAggregator_,
        address stableCoinA_,
        address stableCoinB_,
        uint256 maxDeviation_,
        uint256 stalePeriod_
    )
        UsingProvidersAggregator(providersAggregator_)
        UsingStableAsUsd(stableCoinA_, stableCoinB_)
        UsingMaxDeviation(maxDeviation_)
        UsingStalePeriod(stalePeriod_)
    {}

    /// @inheritdoc IUSDOracle
    function getPriceInUsd(IERC20 _asset) external view returns (uint256 _priceInUsd) {
        require(address(_asset) == VSP_ADDRESS, "invalid-token");
        uint256 _lastUpdatedAt;
        IPriceProvidersAggregator _aggregator = providersAggregator;

        address _stableCoin = _getStableCoinIfPegged(_aggregator.priceProviders(DataTypes.Provider.UNISWAP_V2));
        (_priceInUsd, _lastUpdatedAt) = _aggregator.quote(
            DataTypes.Provider.UNISWAP_V2,
            VSP_ADDRESS,
            _stableCoin,
            ONE_VSP
        );
        (uint256 _priceInUsd1, uint256 _lastUpdatedAt1) = _aggregator.quote(
            DataTypes.Provider.SUSHISWAP,
            VSP_ADDRESS,
            _stableCoin,
            ONE_VSP
        );

        require(
            _priceInUsd > 0 && _priceInUsd1 > 0 && !_priceIsStale(Math.min(_lastUpdatedAt, _lastUpdatedAt1)),
            "one-or-both-prices-invalid"
        );
        require(_isDeviationOK(_priceInUsd, _priceInUsd1), "prices-deviation-too-high");
    }
}
