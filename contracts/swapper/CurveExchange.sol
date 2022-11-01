// SPDX-License-Identifier: MIT

pragma solidity >=0.7.6;
pragma abicoder v2;

import "@openzeppelin/contracts-v3.4.2-solc-0.7/token/ERC20/SafeERC20.sol";
import "../interfaces/swapper/IExchange.sol";
import "../interfaces/external/curve/ICurvePool.sol";

/**
 * @title CurveExchange Exchange
 */
contract CurveExchange is IExchange {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;
    using SafeMath for uint24;
    using Path for bytes;

    /// @inheritdoc IExchange
    /* solhint-disable */
    function getBestAmountIn(
        address tokenIn_,
        address tokenOut_,
        uint256 amountOut_
    ) external override returns (uint256 _amountIn, bytes memory _path) {
        // This can't be implemented with generic method signature.
        // For curve, we need to pool address to get best amount in value.
        revert("not-implemented");
    }

    /// @inheritdoc IExchange
    function getBestAmountOut(
        address tokenIn_,
        address tokenOut_,
        uint256 amountIn_
    ) external override returns (uint256 _amountOut, bytes memory _path) {
        // This can't be implemented with generic method signature.
        // For curve, we need to pool address to get best amount out value.
        revert("not-implemented");
    }

    /* solhint-enable */

    /**
     * @notice Wraps `pool.get_dy_underlying() or pool.get_dy()` function
     */
    function getAmountsIn(uint256 amountOut_, bytes memory path_) public override returns (uint256 _amountIn) {
        _amountIn = getAmounts(amountOut_, path_);
    }

    /**
     * @notice Wraps `pool.get_dy_underlying() or pool.get_dy()` function
     */
    function getAmountsOut(uint256 amountIn_, bytes memory path_) public override returns (uint256 _amountOut) {
        _amountOut = getAmounts(amountIn_, path_);
    }

    /// @inheritdoc IExchange
    function swapExactInput(
        bytes calldata path_,
        uint256 amountIn_,
        uint256 amountOutMin_,
        address outReceiver_
    ) external override returns (uint256 _amountOut) {
        (int128 _tokenInIndex, int128 _tokenOutIndex, address _curvePool, bool isUnderlying) = abi.decode(
            path_,
            (int128, int128, address, bool)
        );
        ICurvePool curvePool = ICurvePool(_curvePool);
        address _tokenInAddress;
        address _tokenOutAddress;
        if (isUnderlying) {
            _tokenInAddress = curvePool.base_coins(_tokenInIndex);
            _tokenOutAddress = curvePool.base_coins(_tokenOutIndex);
        } else {
            _tokenInAddress = curvePool.coins(_tokenInIndex);
            _tokenOutAddress = curvePool.coins(_tokenOutIndex);
        }

        IERC20 _tokenIn = IERC20(_tokenInAddress);
        if (_tokenIn.allowance(address(this), _curvePool) < amountIn_) {
            _tokenIn.approve(address(_curvePool), type(uint256).max);
        }

        if (isUnderlying) {
            _amountOut = curvePool.exchange_underlying(_tokenInIndex, _tokenOutIndex, amountIn_, amountOutMin_);
        } else {
            _amountOut = curvePool.exchange(_tokenInIndex, _tokenOutIndex, amountIn_, amountOutMin_);
        }

        IERC20 _tokenOut = IERC20(_tokenOutAddress);
        if (_amountOut > 0) {
            _tokenOut.safeTransfer(outReceiver_, _amountOut);
        }
    }

    /// @inheritdoc IExchange
    function swapExactOutput(
        bytes calldata path_,
        uint256 amountOut_,
        uint256 amountInMax_,
        address remainingReceiver_,
        address outReceiver_
    ) external override returns (uint256 _amountIn) {
        // This can't be implemented as curve pool provides `exchange_underlying`
        // and `exchange` which can be used in swapExactInput only.
        revert("not-implemented");
    }

    /**
     * @notice private function to wrap `pool.get_dy_underlying() or pool.get_dy()`
     */
    function getAmounts(uint256 amountIn_, bytes memory path_) private returns (uint256 _amountOut) {
        (int128 _tokenInIndex, int128 _tokenOutIndex, address _curvePool, bool isUnderlying) = abi.decode(
            path_,
            (int128, int128, address, bool)
        );
        ICurvePool curvePool = ICurvePool(_curvePool);
        if (isUnderlying) {
            _amountOut = curvePool.get_dy_underlying(_tokenInIndex, _tokenOutIndex, amountIn_);
        } else {
            _amountOut = curvePool.get_dy(_tokenInIndex, _tokenOutIndex, amountIn_);
        }
    }
}
