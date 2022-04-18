// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

/**
 * @title UniswapV3 oracle with ability to query across an intermediate liquidity pool
 */
interface IUniswapV3CrossPoolOracle {
    function nativeToken() external view returns (address);

    function assetToEth(
        address _tokenIn,
        uint256 _amountIn,
        uint24 _fee,
        uint32 _twapPeriod
    ) external view returns (uint256 ethAmountOut);

    function ethToAsset(
        uint256 _ethAmountIn,
        address _tokenOut,
        uint24 _fee,
        uint32 _twapPeriod
    ) external view returns (uint256 amountOut);

    function assetToAsset(
        address _tokenIn,
        uint256 _amountIn,
        address _tokenOut,
        uint24 _fee,
        uint32 _twapPeriod
    ) external view returns (uint256 amountOut);

    function assetToAssetThruRoute(
        address _tokenIn,
        uint256 _amountIn,
        address _tokenOut,
        uint32 _twapPeriod,
        address _routeThruToken,
        uint24[2] memory _poolFees
    ) external view returns (uint256 amountOut);
}
