// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import {PrimaryProdDataServiceConsumerBase} from "@redstone-finance/evm-connector/contracts/data-services/PrimaryProdDataServiceConsumerBase.sol";
import {IRedstonePriceProvider} from "../interfaces/core/IRedstonePriceProvider.sol";
import {IPriceProvider, PriceProvider} from "./PriceProvider.sol";
import {Governable} from "../access/Governable.sol";

/**
 * @title Redstone's price provider
 */
contract RedstonePriceProvider is
    IRedstonePriceProvider,
    PrimaryProdDataServiceConsumerBase,
    PriceProvider,
    Governable
{
    uint256 public constant REDSTONE_DECIMALS = 8;
    uint256 public constant TO_SCALE = 10 ** (USD_DECIMALS - REDSTONE_DECIMALS);
    uint256 internal constant MAX_TIME_TOLERANCE = 1 minutes;

    struct Cache {
        uint256 price;
        uint256 priceTimestamp;
    }

    /// @notice Feed ids (feedId => token)
    mapping(bytes32 => address[]) internal feeds;

    /// @notice Price cache
    mapping(address => Cache) internal cache;

    /// @notice Emitted when an feed id is updated
    event FeedIdUpdated(bytes32 feedId, address[] tokens);

    /// @notice The cache timestamp was updated.
    /// @param price The Redstone price.
    /// @param priceTimestamp The timestamp contained within the price data packages.
    event CacheUpdated(uint256 price, uint256 priceTimestamp);

    /// @notice Get tokens of a feed
    function tokensOf(bytes32 feedId_) external view returns (address[] memory tokens_) {
        return feeds[feedId_];
    }

    /// @notice Update price for the tokens related to the `dataFeedIds_`
    function updatePrice(bytes32[] memory dataFeedIds_) external {
        (uint256[] memory _values, uint256 _timestamp) = _securelyExtractOracleValuesAndTimestampFromTxMsg(
            dataFeedIds_
        );

        uint256 _valuesLength = _values.length;
        require(_valuesLength == dataFeedIds_.length, "invalid-data");

        _timestamp /= 1000; // Redstone uses milliseconds

        for (uint256 i; i < _valuesLength; ++i) {
            address[] memory _tokens = feeds[dataFeedIds_[i]];
            uint256 _tokensLength = _tokens.length;
            for (uint j; j < _tokensLength; ++j) {
                address _token = _tokens[j];
                require(_token != address(0), "feed-unknown");
                if (_timestamp != cache[_token].priceTimestamp) {
                    cache[_token] = Cache({price: _values[i] * TO_SCALE, priceTimestamp: _timestamp});
                }
            }
        }
    }

    /// @inheritdoc IPriceProvider
    function getPriceInUsd(
        address token_
    )
        public
        view
        virtual
        override(IPriceProvider, PriceProvider)
        returns (uint256 _priceInUsd, uint256 _lastUpdatedAt)
    {
        Cache memory _cache = cache[token_];
        uint256 _timestamp = _cache.priceTimestamp;

        require(_timestamp > 0, "no-price");

        if (_timestamp < block.timestamp) {
            require(block.timestamp - _timestamp <= MAX_TIME_TOLERANCE, "price-too-behind");
        }

        if (_timestamp > block.timestamp) {
            require(_timestamp - block.timestamp <= MAX_TIME_TOLERANCE, "price-too-ahead");
        }

        return (_cache.price, _timestamp);
    }

    /// @inheritdoc IRedstonePriceProvider
    /// @dev The feed should be denominated in USD
    function updateFeed(bytes32 feedId_, address[] memory tokens_) external override onlyGovernor {
        require(feedId_ != bytes32(0), "id-is-null");

        feeds[feedId_] = tokens_;

        emit FeedIdUpdated(feedId_, tokens_);
    }
}
