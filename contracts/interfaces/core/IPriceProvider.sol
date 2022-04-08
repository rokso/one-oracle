// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

interface IPriceProvider {
    /**
     * @notice Get quote
     * @param _tokenIn The address of assetIn
     * @param _tokenOut The address of assetOut
     * @param _amountIn Amount of input token
     * @return _amountOut , _lastUpdatedAt. Amount out and last updated timestamp
     */
    function quote(
        address _tokenIn,
        address _tokenOut,
        uint256 _amountIn
    ) external view returns (uint256 _amountOut, uint256 _lastUpdatedAt);
}
