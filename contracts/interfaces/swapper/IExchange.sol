// SPDX-License-Identifier: MIT

pragma solidity <=0.8.9;

/**
 * @notice Exchange interface
 */
interface IExchange {
    /**
     * @notice Get *spot* quote
     * It will return the swap amount based on the current reserves of the best pair/path found (i.e. spot price)
     * @dev It shouldn't be used as oracle!!!
     */
    function getBestAmountIn(
        address tokenIn_,
        address tokenOut_,
        uint256 amountOut_
    ) external view returns (uint256 _amountIn, address[] memory _path);

    /**
     * @notice Get *spot* quote
     * It will return the swap amount based on the current reserves of the best pair/path found (i.e. spot price)
     * @dev It shouldn't be used as oracle!!!
     */
    function getBestAmountOut(
        address tokenIn_,
        address tokenOut_,
        uint256 amountIn_
    ) external view returns (uint256 _amountOut, address[] memory _path);

    /**
     * @notice Perform an exact input swap
     * @dev Should transfer `amountIn_` before performing swap
     */
    function swapExactInput(
        address[] calldata path_,
        uint256 amountIn_,
        uint256 amountOutMin_,
        address outReceiver_
    ) external returns (uint256 _amountOut);

    /**
     * @notice Perform an exact output swap
     * @dev Should transfer `amountInMax_` before performing swap
     * @dev Sends swap remanings - if any - to the `inSender_`
     */
    function swapExactOutput(
        address[] calldata path_,
        uint256 amountOut_,
        uint256 amountInMax_,
        address inSender_,
        address outRecipient_
    ) external returns (uint256 _amountIn);
}
