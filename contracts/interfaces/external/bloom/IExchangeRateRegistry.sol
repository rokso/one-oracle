// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

interface IExchangeRateRegistry {
    function getExchangeRate(address token) external view returns (uint256);
}
