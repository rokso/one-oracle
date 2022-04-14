// SPDX-License-Identifier: MIT

pragma solidity 0.7.6;

import "@uniswap/v3-periphery/contracts/libraries/OracleLibrary.sol";
import "@uniswap/v3-periphery/contracts/libraries/PoolAddress.sol";
import "../libraries/SafeUint128.sol";

/// @title UniswapV3 oracle with ability to query across an intermediate liquidity pool
/// @dev Based on https://etherscan.io/address/0x0f1f5a87f99f0918e6c81f16e59f3518698221ff#code
/// @dev Having this as a separated contract to due to solc version conflicts with uniswap contracts
// TODO: Rename function params to use _ as suffix
contract UniswapV3CrossPoolOracle {
    // UniswapV3 has its factopry deployed with the same address in all chains
    // See: https://docs.uniswap.org/protocol/reference/deployments
    address public constant UNISWAP_V3_FACTORY = 0x1F98431c8aD98523631AE4a59f267346ea31F984;
    address public immutable nativeToken;

    constructor(address _nativeToken) {
        nativeToken = _nativeToken;
    }

    function assetToEth(
        address _tokenIn,
        uint256 _amountIn,
        uint24 _fee,
        uint32 _twapPeriod
    ) public view returns (uint256 ethAmountOut) {
        return _fetchTwap(_tokenIn, nativeToken, _fee, _twapPeriod, _amountIn);
    }

    function ethToAsset(
        uint256 _ethAmountIn,
        address _tokenOut,
        uint24 _fee,
        uint32 _twapPeriod
    ) public view returns (uint256 amountOut) {
        return _fetchTwap(nativeToken, _tokenOut, _fee, _twapPeriod, _ethAmountIn);
    }

    function assetToAsset(
        address _tokenIn,
        uint256 _amountIn,
        address _tokenOut,
        uint24 _fee,
        uint32 _twapPeriod
    ) public view returns (uint256 amountOut) {
        if (_tokenIn == nativeToken) {
            return ethToAsset(_amountIn, _tokenOut, _fee, _twapPeriod);
        } else if (_tokenOut == nativeToken) {
            return assetToEth(_tokenIn, _amountIn, _fee, _twapPeriod);
        } else {
            uint256 ethAmount = assetToEth(_tokenIn, _amountIn, _fee, _twapPeriod);
            return ethToAsset(ethAmount, _tokenOut, _fee, _twapPeriod);
        }
    }

    function assetToAssetThruRoute(
        address _tokenIn,
        uint256 _amountIn,
        address _tokenOut,
        uint32 _twapPeriod,
        address _routeThruToken,
        uint24[2] memory _poolFees
    ) public view returns (uint256 amountOut) {
        require(_poolFees.length <= 2, "uniV3CPOracle: bad fees length");
        uint24 pool0Fee = _poolFees[0];
        uint24 pool1Fee = _poolFees[1];
        address routeThruToken = _routeThruToken == address(0) ? nativeToken : _routeThruToken;

        if (routeThruToken == nativeToken && pool0Fee == pool1Fee) {
            // Same as basic assetToAsset()
            return assetToAsset(_tokenIn, _amountIn, _tokenOut, pool0Fee, _twapPeriod);
        }

        if (_tokenIn == routeThruToken || _tokenOut == routeThruToken) {
            // Can skip routeThru token
            return _fetchTwap(_tokenIn, _tokenOut, pool0Fee, _twapPeriod, _amountIn);
        }

        // Cross pools through routeThru
        uint256 routeThruAmount = _fetchTwap(_tokenIn, routeThruToken, pool0Fee, _twapPeriod, _amountIn);
        return _fetchTwap(routeThruToken, _tokenOut, pool1Fee, _twapPeriod, routeThruAmount);
    }

    function _fetchTwap(
        address _tokenIn,
        address _tokenOut,
        uint24 _poolFee,
        uint32 _twapPeriod,
        uint256 _amountIn
    ) internal view returns (uint256 amountOut) {
        address pool = PoolAddress.computeAddress(
            UNISWAP_V3_FACTORY,
            PoolAddress.getPoolKey(_tokenIn, _tokenOut, _poolFee)
        );
        // Leave twapTick as a int256 to avoid solidity casting
        (int256 twapTick, ) = OracleLibrary.consult(pool, _twapPeriod);
        return
            OracleLibrary.getQuoteAtTick(
                int24(twapTick), // can assume safe being result from consult()
                SafeUint128.toUint128(_amountIn),
                _tokenIn,
                _tokenOut
            );
    }
}
