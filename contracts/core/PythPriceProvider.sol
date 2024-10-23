// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import {IPyth} from "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import {PythStructs} from "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import {IPythPriceProvider} from "../interfaces/core/IPythPriceProvider.sol";
import {IPriceProvider, PriceProvider} from "./PriceProvider.sol";
import {Governable} from "../access/Governable.sol";

/**
 * @title Pyth's price provider
 * @dev This contract wraps Pyth contract
 */
contract PythPriceProvider is IPythPriceProvider, PriceProvider, Governable {
    using SafeCast for int256;

    int256 internal constant MIN_EXPONENT = -18;
    int256 internal constant MAX_EXPONENT = 0;
    uint256 internal constant MAX_TIME_TOLERANCE = 1 minutes;

    /// @notice Pyth main contract
    IPyth public immutable pyth;

    /// @notice Feed ids map (token => feedId)
    mapping(address => bytes32) public feedIds;

    /// @notice Emitted when an aggregator is updated
    event FeedIdUpdated(address token, bytes32 feedId);

    constructor(IPyth pyth_) {
        pyth = pyth_;
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
        bytes32 _feedId = feedIds[token_];
        require(_feedId != bytes32(0), "token-without-feed-ids");

        PythStructs.Price memory _p = pyth.getPriceUnsafe(_feedId);

        if (_p.publishTime < block.timestamp) {
            require(block.timestamp - _p.publishTime <= MAX_TIME_TOLERANCE, "price-too-behind");
        }

        if (_p.publishTime > block.timestamp) {
            require(_p.publishTime - block.timestamp <= MAX_TIME_TOLERANCE, "price-too-ahead");
        }

        require(_p.price > 0, "price-negative-or-zero");
        require(_p.expo >= MIN_EXPONENT && _p.expo <= MAX_EXPONENT, "invalid-expo");

        uint256 _toScale = (10 ** int256(18 + _p.expo).toUint256());
        uint256 _price = int256(_p.price).toUint256() * _toScale;

        return (_price, _p.publishTime);
    }

    /// @inheritdoc IPythPriceProvider
    function updateFeedId(address token_, bytes32 feedId_) external override onlyGovernor {
        require(token_ != address(0), "token-is-null");

        feedIds[token_] = feedId_;

        emit FeedIdUpdated(token_, feedId_);
    }
}
