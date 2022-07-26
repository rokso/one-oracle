// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "@openzeppelin/contracts/utils/math/Math.sol";
import "../interfaces/core/IChainlinkPriceProvider.sol";
import "../interfaces/periphery/IOracle.sol";

contract ChainlinkOracleMock is IOracle {
    IChainlinkPriceProvider public immutable chainlink;

    constructor(IChainlinkPriceProvider chainlink_) {
        chainlink = chainlink_;
    }

    function getPriceInUsd(address asset_) public view override returns (uint256 _priceInUsd) {
        (_priceInUsd, ) = chainlink.getPriceInUsd(asset_);
    }

    function quote(
        address, /*tokenIn_*/
        address, /*tokenOut_*/
        uint256 /*amountIn_*/
    )
        external
        pure
        returns (
            uint256 /*_amountOut*/
        )
    {
        revert("not-implemented");
    }

    function quoteTokenToUsd(
        address, /*token_*/
        uint256 /*amountIn_*/
    )
        external
        pure
        returns (
            uint256 /*amountOut_*/
        )
    {
        revert("not-implemented");
    }

    function quoteUsdToToken(
        address, /*token_*/
        uint256 /*amountIn_*/
    )
        external
        pure
        returns (
            uint256 /*_amountOut*/
        )
    {
        revert("not-implemented");
    }
}
