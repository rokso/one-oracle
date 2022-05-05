// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "../swapper/UniswapV2LikeExchange.sol";

contract UniswapV2LikeExchangeMock is UniswapV2LikeExchange {
    constructor(IUniswapV2Router02 router_, address wethLike_) UniswapV2LikeExchange(router_, wethLike_) {}

    function getAmountsOut(uint256 amountIn_, address[] memory path_) public view returns (uint256 _amountOut) {
        return _getAmountsOut(amountIn_, path_);
    }

    function getAmountsIn(uint256 _amountOut, address[] memory _path) public view returns (uint256 _amountIn) {
        return _getAmountsIn(_amountOut, _path);
    }
}
