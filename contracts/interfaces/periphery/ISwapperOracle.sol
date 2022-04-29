// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

/**
 * @notice Swapper's Oracle interface
 */
interface ISwapperOracle {
    /**
     * @notice Get quote
     * @param tokenIn_ The address of assetIn
     * @param tokenOut_ The address of assetOut
     * @param amountIn_ Amount of input token
     * @return _amountOut Amount out
     */
    function quote(
        address tokenIn_,
        address tokenOut_,
        uint256 amountIn_
    ) external view returns (uint256 _amountOut);
}
