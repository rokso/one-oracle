// SPDX-License-Identifier: MIT

pragma solidity >=0.6.2;

library OracleHelpers {
    function scaleDecimal(
        uint256 amount,
        uint256 _fromDecimal,
        uint256 _toDecimal
    ) internal pure returns (uint256) {
        if (_fromDecimal > _toDecimal) {
            return amount / (10**(_fromDecimal - _toDecimal));
        } else if (_fromDecimal < _toDecimal) {
            return amount * (10**(_toDecimal - _fromDecimal));
        }
        return amount;
    }

    function isDeviationOK(
        uint256 a,
        uint256 b,
        uint256 maxDeviation
    ) internal pure returns (bool) {
        uint256 _deviation = a > b ? ((a - b) * 1e18) / a : ((b - a) * 1e18) / b;
        return _deviation <= maxDeviation;
    }
}
