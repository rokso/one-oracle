// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/utils/math/SafeCast.sol";
import "../interfaces/core/IFluxPriceProvider.sol";
import "../features/UsingMaxDeviation.sol";
import "./PriceProvider.sol";

/**
 * @title Flux's price provider
 * @dev The Flux uses the same aggregator's interface as Chainlink
 */
contract FluxPriceProvider is IFluxPriceProvider, PriceProvider, UsingMaxDeviation {
    using SafeCast for int256;
    using EnumerableSet for EnumerableSet.AddressSet;

    uint256 public constant FLUX_DECIMALS = 8;
    uint256 public constant TO_SCALE = 10**(USD_DECIMALS - FLUX_DECIMALS);

    /**
     * @notice Aggregators map (token => aggregator[])
     */
    mapping(address => EnumerableSet.AddressSet) internal aggregatorsOf;

    /// Emitted when an aggregator is added
    event AggregatorAdded(address token, address aggregator);

    /// Emitted when an aggregator is removed
    event AggregatorRemoved(address token, address aggregator);

    constructor(uint256 maxDeviation_) UsingMaxDeviation(maxDeviation_) {}

    /**
     * @notice Get all aggregators of token
     * @dev WARNING: This operation will copy the entire storage to memory, which can be quite expensive. This is designed
     * to mostly be used by view accessors that are queried without any gas fees.
     */
    function getAggregatorsOf(address token_) external view returns (address[] memory) {
        return aggregatorsOf[token_].values();
    }

    /**
     * @inheritdoc IPriceProvider
     * @dev Sweep all aggregators and get the most recent price, revert if deviation among prices are too high.
     */
    function getPriceInUsd(address token_)
        public
        view
        override(IPriceProvider, PriceProvider)
        returns (uint256 _priceInUsd, uint256 _lastUpdatedAt)
    {
        EnumerableSet.AddressSet storage _aggregatorOf = aggregatorsOf[token_];

        uint256 _len = aggregatorsOf[token_].length();
        require(_len > 0, "aggregator-not-found");
        int256 _price;
        (, _price, , _lastUpdatedAt, ) = AggregatorV3Interface(_aggregatorOf.at(0)).latestRoundData();

        for (uint256 i = 1; i < _len; ++i) {
            (, int256 _iPrice, , uint256 _iLastUpdatedAt, ) = AggregatorV3Interface(_aggregatorOf.at(i))
                .latestRoundData();

            require(_isDeviationOK(_iPrice.toUint256(), _price.toUint256()), "prices-deviation-too-high");

            if (_iLastUpdatedAt > _lastUpdatedAt) {
                _price = _iPrice;
                _lastUpdatedAt = _iLastUpdatedAt;
            }
        }

        return (_price.toUint256() * TO_SCALE, _lastUpdatedAt);
    }

    /// @inheritdoc IPriceProvider
    function quote(
        address tokenIn_,
        address tokenOut_,
        uint256 amountIn_
    ) external view override returns (uint256 _amountOut, uint256 _lastUpdatedAt) {
        (uint256 _amountInUsd, uint256 _lastUpdatedAt0) = quoteTokenToUsd(tokenIn_, amountIn_);
        (_amountOut, _lastUpdatedAt) = quoteUsdToToken(tokenOut_, _amountInUsd);
        _lastUpdatedAt = Math.min(_lastUpdatedAt0, _lastUpdatedAt);
    }

    /// @inheritdoc IFluxPriceProvider
    function addAggregator(address token_, address aggregator_) external override onlyGovernor {
        require(token_ != address(0), "token-is-null");
        require(aggregator_ != address(0), "aggregator-is-null");
        require(AggregatorV3Interface(aggregator_).decimals() == FLUX_DECIMALS, "invalid-decimals");
        require(aggregatorsOf[token_].add(aggregator_), "aggregator-exists");

        emit AggregatorAdded(token_, aggregator_);
    }

    /// @inheritdoc IFluxPriceProvider
    function removeAggregator(address token_, address aggregator_) external override onlyGovernor {
        require(token_ != address(0), "token-is-null");
        require(aggregator_ != address(0), "aggregator-is-null");

        require(aggregatorsOf[token_].remove(aggregator_), "aggregator-doesnt-exist");

        emit AggregatorRemoved(token_, aggregator_);
    }
}
