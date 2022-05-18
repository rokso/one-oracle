// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "@openzeppelin/contracts/utils/math/Math.sol";
import "../../features/UsingMaxDeviation.sol";
import "../../features/UsingStalePeriod.sol";
import "../../features/UsingStableAsUsd.sol";
import "../../interfaces/core/IPriceProvidersAggregator.sol";
import "../../interfaces/periphery/IVSPOracle.sol";

/**
 * @title Main oracle
 * @dev Reuses `PriceProvidersAggregator` and add support to USD quotes
 */
contract VspMainnetOracle is IVSPOracle, UsingMaxDeviation, UsingStalePeriod, UsingStableAsUsd {
    uint256 public constant ONE_VSP = 1e18;
    address public constant VSP_ADDRESS = 0x1b40183EFB4Dd766f11bDa7A7c3AD8982e998421;

    /**
     * @notice The price providers aggregators contract
     */
    IPriceProvidersAggregator public providersAggregator;

    /// @notice Emitted when providers aggregator is updated
    event ProvidersAggregatorUpdated(
        IPriceProvidersAggregator oldProvidersAggregator,
        IPriceProvidersAggregator newProvidersAggregator
    );

    constructor(
        IPriceProvidersAggregator providersAggregator_,
        address stableCoin_,
        uint256 maxDeviation_,
        uint256 stalePeriod_
    ) UsingMaxDeviation(maxDeviation_) UsingStalePeriod(stalePeriod_) UsingStableAsUsd(stableCoin_) {
        require(address(providersAggregator_) != address(0), "aggregator-is-null");
        providersAggregator = providersAggregator_;
    }

    /// @inheritdoc IUSDOracle
    function getPriceInUsd(IERC20 _asset) external view returns (uint256 _priceInUsd) {
        require(address(_asset) == VSP_ADDRESS, "invalid-token");
        uint256 _lastUpdatedAt;
        (_priceInUsd, _lastUpdatedAt) = providersAggregator.quote(
            DataTypes.Provider.UNISWAP_V2,
            VSP_ADDRESS,
            stableCoin,
            ONE_VSP
        );
        (uint256 _priceInUsd1, uint256 _lastUpdatedAt1) = providersAggregator.quote(
            DataTypes.Provider.SUSHISWAP,
            VSP_ADDRESS,
            stableCoin,
            ONE_VSP
        );

        require(
            _priceInUsd > 0 && _priceInUsd1 > 0 && !_priceIsStale(Math.min(_lastUpdatedAt, _lastUpdatedAt1)),
            "one-or-both-prices-invalid"
        );
        require(_isDeviationOK(_priceInUsd, _priceInUsd1), "prices-deviation-too-high");
    }

    /// @inheritdoc IVSPOracle
    function updateProvidersAggregator(IPriceProvidersAggregator providersAggregator_) external onlyGovernor {
        require(address(providersAggregator_) != address(0), "address-is-null");
        emit ProvidersAggregatorUpdated(providersAggregator, providersAggregator_);
        providersAggregator = providersAggregator_;
    }
}
