// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "../access/Governable.sol";
import "../interfaces/core/IChainlinkPriceProvider.sol";
import "../interfaces/core/IPriceProvidersAggregator.sol";
import "../interfaces/periphery/IChainlinkAndFallbacksOracle.sol";
import "../libraries/OracleHelpers.sol";

/**
 * @title Chainlink and Fallbacks oracle
 * @dev Uses chainlink as primary oracle, if it doesn't support the asset(s), get price from fallback providers
 */
contract ChainlinkAndFallbacksOracle is IChainlinkAndFallbacksOracle, Governable {
    /// @notice The max acceptable deviation from fallbacks' prices
    uint256 public maxDeviation;

    /// @notice The stale period. It's used to determine if a price is invalid (i.e. outdated)
    uint256 public stalePeriod;

    /// @notice The PriceProvidersAggregator contract
    IPriceProvidersAggregator public providersAggregator;

    /// @notice The fallback provider A. It's used when Chainlink isn't available
    DataTypes.Provider public fallbackProviderA;

    /// @notice The fallback provider B. It's used when Chainlink isn't available
    /// @dev This is optional
    DataTypes.Provider public fallbackProviderB;

    /// @notice Emitted when fallback providers are updated
    event FallbackProvidersUpdated(
        DataTypes.Provider oldfallbackProviderA,
        DataTypes.Provider newfallbackProviderA,
        DataTypes.Provider oldfallbackProviderB,
        DataTypes.Provider newfallbackProviderB
    );

    /// @notice Emitted when max deviation is updated
    event MaxDeviationUpdated(uint256 oldMaxDeviation, uint256 newMaxDeviation);

    /// @notice Emitted when stale period is updated
    event StalePeriodUpdated(uint256 oldStalePeriod, uint256 newStalePeriod);

    /// @notice Emitted when providers aggregator is updated
    event ProvidersAggregatorUpdated(
        IPriceProvidersAggregator oldProvidersAggregator,
        IPriceProvidersAggregator newProvidersAggregator
    );

    constructor(
        IPriceProvidersAggregator providersAggregator_,
        uint256 maxDeviation_,
        uint256 stalePeriod_,
        DataTypes.Provider fallbackProviderA_,
        DataTypes.Provider fallbackProviderB_
    ) {
        require(fallbackProviderA_ != DataTypes.Provider.NONE, "fallback-provider-not-set");
        providersAggregator = providersAggregator_;
        stalePeriod = stalePeriod_;
        maxDeviation = maxDeviation_;
        fallbackProviderA = fallbackProviderA_;
        fallbackProviderB = fallbackProviderB_;
    }

    /// @inheritdoc IChainlinkAndFallbacksOracle
    function quote(
        address tokenIn_,
        address tokenOut_,
        uint256 amountIn_
    ) external view returns (uint256 _amountOut) {
        // 1. Get price from chainlink
        uint256 _lastUpdatedAt;
        (_amountOut, _lastUpdatedAt) = _quote(DataTypes.Provider.CHAINLINK, tokenIn_, tokenOut_, amountIn_);

        // 2. If price from chainlink is OK return it
        if (_amountOut > 0 && !_priceIsStale(_lastUpdatedAt)) {
            return _amountOut;
        }

        // 3. Get price from fallback A
        (uint256 _amountOutA, uint256 _lastUpdatedAtA) = _quote(fallbackProviderA, tokenIn_, tokenOut_, amountIn_);

        // 4. If price from fallback A is OK and there isn't a fallback B, return price from fallback A
        bool _aPriceOK = _amountOutA > 0 && !_priceIsStale(_lastUpdatedAtA);
        if (fallbackProviderB == DataTypes.Provider.NONE) {
            require(_aPriceOK, "fallback-a-failed");
            return _amountOutA;
        }

        // 5. Get price from fallback B
        (uint256 _amountOutB, uint256 _lastUpdatedAtB) = _quote(fallbackProviderB, tokenIn_, tokenOut_, amountIn_);

        // 6. If only one price from fallbacks is valid, return it
        bool _bPriceOK = _amountOutB > 0 && !_priceIsStale(_lastUpdatedAtB);
        if (!_bPriceOK && _aPriceOK) {
            return _amountOutA;
        } else if (_bPriceOK && !_aPriceOK) {
            return _amountOutB;
        }

        // 7. Check fallback prices deviation
        require(_aPriceOK && _bPriceOK, "fallbacks-failed");
        require(OracleHelpers.isDeviationOK(_amountOutA, _amountOutB, maxDeviation), "prices-deviation-too-high");

        // 8. If deviation is OK, return price from fallback A
        return _amountOutA;
    }

    /**
     * @notice Wrapped providers aggregator's quote function
     * @dev Return [0,0] (i.e. invalid quote) if the call reverts
     */
    function _quote(
        DataTypes.Provider provider_,
        address tokenIn_,
        address tokenOut_,
        uint256 amountIn_
    ) private view returns (uint256 _amountOut, uint256 _lastUpdatedAt) {
        try providersAggregator.quote(provider_, tokenIn_, tokenOut_, amountIn_) returns (
            uint256 __amountOut,
            uint256 __lastUpdatedAt
        ) {
            _amountOut = __amountOut;
            _lastUpdatedAt = __lastUpdatedAt;
        } catch {}
    }

    /**
     * @notice Update fallback providers
     * @dev The fallback provider B is optional
     */
    function updateFallbackProviders(DataTypes.Provider fallbackProviderA_, DataTypes.Provider fallbackProviderB_)
        public
        onlyGovernor
    {
        require(fallbackProviderA_ != DataTypes.Provider.NONE, "fallback-a-is-null");
        emit FallbackProvidersUpdated(fallbackProviderA, fallbackProviderA_, fallbackProviderB, fallbackProviderB_);
        fallbackProviderA = fallbackProviderA_;
        fallbackProviderB = fallbackProviderB_;
    }

    /**
     * @notice Update max deviation
     */
    function updateMaxDeviation(uint256 maxDeviation_) public onlyGovernor {
        emit MaxDeviationUpdated(maxDeviation, maxDeviation_);
        maxDeviation = maxDeviation_;
    }

    /**
     * @notice Update PriceProvidersAggregator contract
     */
    function updateProvidersAggregator(IPriceProvidersAggregator providersAggregator_) public onlyGovernor {
        require(address(providersAggregator_) != address(0), "address-is-null");
        emit ProvidersAggregatorUpdated(providersAggregator, providersAggregator_);
        providersAggregator = providersAggregator_;
    }

    /**
     * @notice Update stale period
     */
    function updateStalePeriod(uint256 stalePeriod_) public onlyGovernor {
        emit StalePeriodUpdated(stalePeriod, stalePeriod_);
        stalePeriod = stalePeriod_;
    }

    /**
     * @notice Check if a price timestamp is outdated
     * @param _timeOfLastUpdate The price timestamp
     * @return true if price is stale (outdated)
     */
    function _priceIsStale(uint256 _timeOfLastUpdate) private view returns (bool) {
        return block.timestamp - _timeOfLastUpdate > stalePeriod;
    }
}
