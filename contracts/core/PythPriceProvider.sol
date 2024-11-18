// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import {IPyth} from "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import {PythStructs} from "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";
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
    using Address for address payable;

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

    /// @notice Get update fee (native coin)
    function getUpdateFee(bytes[] calldata updateData_) external view returns (uint _feeAmount) {
        return pyth.getUpdateFee(updateData_);
    }

    /// @notice Update Pyth's prices
    function updatePrice(bytes[] calldata updateData_) external payable {
        uint256 _fee = pyth.getUpdateFee(updateData_);
        require(msg.value >= _fee, "value-too-low");

        pyth.updatePriceFeeds{value: _fee}(updateData_);

        if (msg.value > _fee) {
            payable(msg.sender).sendValue(msg.value - _fee);
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
        bytes32 _feedId = feedIds[token_];

        if (_feedId == bytes32(0)) {
            return (0, 0);
        }

        PythStructs.Price memory _p = pyth.getPriceUnsafe(_feedId);
        _lastUpdatedAt = _p.publishTime;

        if (_lastUpdatedAt < block.timestamp && block.timestamp - _lastUpdatedAt > MAX_TIME_TOLERANCE) {
            return (0, 0);
        }

        if (_lastUpdatedAt > block.timestamp && _lastUpdatedAt - block.timestamp > MAX_TIME_TOLERANCE) {
            return (0, 0);
        }

        if (_p.price == 0) {
            return (0, 0);
        }

        if (_p.expo < MIN_EXPONENT || _p.expo > MAX_EXPONENT) {
            return (0, 0);
        }

        uint256 _toScale = (10 ** int256(18 + _p.expo).toUint256());
        _priceInUsd = int256(_p.price).toUint256() * _toScale;
    }

    /// @inheritdoc IPythPriceProvider
    function updateFeedId(address token_, bytes32 feedId_) external override onlyGovernor {
        require(token_ != address(0), "token-is-null");

        feedIds[token_] = feedId_;

        emit FeedIdUpdated(token_, feedId_);
    }
}
