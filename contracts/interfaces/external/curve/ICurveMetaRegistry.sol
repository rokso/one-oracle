// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

interface ICurveMetaRegistry {
    function get_lp_token(address _pool) external view returns (address);

    function get_n_underlying_coins(address _pool) external view returns (uint256);

    function get_pool_from_lp_token(address _token) external view returns (address);

    function get_underlying_coins(address _pool) external view returns (address[8] memory);
}
