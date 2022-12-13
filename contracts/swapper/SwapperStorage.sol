// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "../interfaces/swapper/ISwapper.sol";
import "../libraries/DataTypes.sol";

abstract contract SwapperStorage is ISwapper {
    /**
     * @notice List of the supported exchanges
     */
    EnumerableSet.AddressSet internal allExchanges;

    /**
     * @notice List of the exchanges to loop over when getting best paths
     */
    EnumerableSet.AddressSet internal mainExchanges;

    /**
     * @notice Mapping of exchanges' addresses by type
     */
    mapping(DataTypes.ExchangeType => address) public addressOf;

    /**
     * @notice Default swap routings
     * @dev Used to save gas by using a preset routing instead of looking for the best
     */
    mapping(bytes => bytes) public defaultRoutings;

    /**
     * @notice The oracle contract
     * @dev This is used to set acceptable slippage parameters
     */
    IOracle public override oracle;

    /**
     * @notice Max slippage acceptable
     * @dev Use 18 decimals (e.g. 0.2e18 = 20%)
     */
    uint256 public override maxSlippage;
}
