// SPDX-License-Identifier: MIT

pragma solidity 0.7.6;

import "@uniswap/v3-periphery/contracts/libraries/OracleLibrary.sol";
import "@uniswap/v3-periphery/contracts/libraries/PoolAddress.sol";
import "../libraries/SafeUint128.sol";

/// @title UniswapV3 oracle with ability to query across an intermediate liquidity pool
/// @dev Based on https://etherscan.io/address/0x0f1f5a87f99f0918e6c81f16e59f3518698221ff#code
/// @dev Having this as a separated contract to due to solc version conflicts with uniswap contracts
contract UniswapV3CrossPoolOracle {
    // UniswapV3 has its factopry deployed with the same address in all chains
    // See: https://docs.uniswap.org/protocol/reference/deployments
    address public constant UNISWAP_V3_FACTORY = 0x1F98431c8aD98523631AE4a59f267346ea31F984;
    address public immutable nativeToken;

    constructor(address nativeToken_) {
        nativeToken = nativeToken_;
    }

    function assetToEth(
        address tokenIn_,
        uint256 amountIn_,
        uint24 fee_,
        uint32 twapPeriod_
    ) public view returns (uint256 ethAmountOut) {
        return _fetchTwap(tokenIn_, nativeToken, fee_, twapPeriod_, amountIn_);
    }

    function ethToAsset(
        uint256 _ethAmountIn,
        address tokenOut_,
        uint24 fee_,
        uint32 twapPeriod_
    ) public view returns (uint256 amountOut) {
        return _fetchTwap(nativeToken, tokenOut_, fee_, twapPeriod_, _ethAmountIn);
    }

    function assetToAsset(
        address tokenIn_,
        uint256 amountIn_,
        address tokenOut_,
        uint24 fee_,
        uint32 twapPeriod_
    ) public view returns (uint256 amountOut) {
        if (tokenIn_ == nativeToken) {
            return ethToAsset(amountIn_, tokenOut_, fee_, twapPeriod_);
        } else if (tokenOut_ == nativeToken) {
            return assetToEth(tokenIn_, amountIn_, fee_, twapPeriod_);
        } else {
            uint256 ethAmount = assetToEth(tokenIn_, amountIn_, fee_, twapPeriod_);
            return ethToAsset(ethAmount, tokenOut_, fee_, twapPeriod_);
        }
    }

    function assetToAssetThruRoute(
        address tokenIn_,
        uint256 amountIn_,
        address tokenOut_,
        uint32 twapPeriod_,
        address routeThruToken_,
        uint24[2] memory poolFees_
    ) public view returns (uint256 amountOut) {
        require(poolFees_.length <= 2, "uniV3CPOracle: bad fees length");
        uint24 _pool0Fee = poolFees_[0];
        uint24 _pool1Fee = poolFees_[1];
        address _routeThruToken = routeThruToken_ == address(0) ? nativeToken : routeThruToken_;

        if (_routeThruToken == nativeToken && _pool0Fee == _pool1Fee) {
            // Same as basic assetToAsset()
            return assetToAsset(tokenIn_, amountIn_, tokenOut_, _pool0Fee, twapPeriod_);
        }

        if (tokenIn_ == _routeThruToken || tokenOut_ == _routeThruToken) {
            // Can skip routeThru token
            return _fetchTwap(tokenIn_, tokenOut_, _pool0Fee, twapPeriod_, amountIn_);
        }

        // Cross pools through routeThru
        uint256 _routeThruAmount = _fetchTwap(tokenIn_, _routeThruToken, _pool0Fee, twapPeriod_, amountIn_);
        return _fetchTwap(_routeThruToken, tokenOut_, _pool1Fee, twapPeriod_, _routeThruAmount);
    }

    function _fetchTwap(
        address tokenIn_,
        address tokenOut_,
        uint24 poolFee_,
        uint32 twapPeriod_,
        uint256 amountIn_
    ) internal view returns (uint256 amountOut) {
        address _pool = PoolAddress.computeAddress(
            UNISWAP_V3_FACTORY,
            PoolAddress.getPoolKey(tokenIn_, tokenOut_, poolFee_)
        );
        // Leave twapTick as a int256 to avoid solidity casting
        (int256 _twapTick, ) = OracleLibrary.consult(_pool, twapPeriod_);
        return
            OracleLibrary.getQuoteAtTick(
                int24(_twapTick), // can assume safe being result from consult()
                SafeUint128.toUint128(amountIn_),
                tokenIn_,
                tokenOut_
            );
    }
}
