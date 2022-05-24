// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "../access/Governable.sol";
import "../interfaces/swapper/IExchange.sol";

/**
 * @notice UniswapV2 Like Exchange
 */
contract UniswapV2LikeExchange is IExchange, Governable {
    using SafeERC20 for IERC20;

    /**
     * @notice The WETH-Like token (a.k.a. Native Token)
     * @dev I.e. should be the most liquid token that offer best routers among trade pairs
     * @dev It's usually the wrapper token of the chain's native coin but it isn't always true
     * For instance: On Polygon, the `WETH` is more liquid than `WMATIC` on UniV3 protocol.
     */
    address public wethLike;

    /**
     * @notice The UniswapV2-Like router contract
     */
    IUniswapV2Router02 public immutable router;

    /// @notice Emitted when wethLike token is updated
    event WethLikeTokenUpdated(address oldWethLike, address newWethLike);

    /**
     * @dev Doesn't consider router.WETH() as `wethLike` because isn't guaranteed that it's the most liquid token.
     */
    constructor(IUniswapV2Router02 router_, address wethLike_) {
        router = router_;
        wethLike = wethLike_;
    }

    /// @inheritdoc IExchange
    function getBestAmountIn(
        address tokenIn_,
        address tokenOut_,
        uint256 amountOut_
    ) external view returns (uint256 _amountIn, address[] memory _path) {
        // 1. Check IN-OUT pair
        address[] memory _pathA = new address[](2);
        _pathA[0] = tokenIn_;
        _pathA[1] = tokenOut_;
        uint256 _amountInA = _getAmountsIn(amountOut_, _pathA);

        if (tokenIn_ == wethLike || tokenOut_ == wethLike) {
            // Returns if one of the token is WETH-Like
            require(_amountInA > 0, "invalid-swap");
            return (_amountInA, _pathA);
        }

        // 2. Check IN-WETH-OUT path
        address[] memory _pathB = new address[](3);
        _pathB[0] = tokenIn_;
        _pathB[1] = wethLike;
        _pathB[2] = tokenOut_;
        uint256 _amountInB = _getAmountsIn(amountOut_, _pathB);

        // 3. Get best route between paths A and B
        require(_amountInA > 0 || _amountInB > 0, "invalid-swap");

        // Returns A if it's valid and better than B or if B isn't valid
        if ((_amountInA > 0 && _amountInA < _amountInB) || _amountInB == 0) {
            return (_amountInA, _pathA);
        }
        return (_amountInB, _pathB);
    }

    /// @inheritdoc IExchange
    function getBestAmountOut(
        address tokenIn_,
        address tokenOut_,
        uint256 amountIn_
    ) external view returns (uint256 _amountOut, address[] memory _path) {
        // 1. Check IN-OUT pair
        address[] memory _pathA = new address[](2);
        _pathA[0] = tokenIn_;
        _pathA[1] = tokenOut_;
        uint256 _amountOutA = _getAmountsOut(amountIn_, _pathA);

        if (tokenIn_ == wethLike || tokenOut_ == wethLike) {
            // Returns if one of the token is WETH-Like
            require(_amountOutA > 0, "invalid-swap");
            return (_amountOutA, _pathA);
        }

        // 2. Check IN-WETH-OUT path
        address[] memory _pathB = new address[](3);
        _pathB[0] = tokenIn_;
        _pathB[1] = wethLike;
        _pathB[2] = tokenOut_;
        uint256 _amountOutB = _getAmountsOut(amountIn_, _pathB);

        // 3. Get best route between paths A and B
        require(_amountOutA > 0 || _amountOutB > 0, "invalid-swap");
        if (_amountOutA > _amountOutB) return (_amountOutA, _pathA);
        return (_amountOutB, _pathB);
    }

    /// @inheritdoc IExchange
    function swapExactInput(
        address[] calldata path_,
        uint256 amountIn_,
        uint256 amountOutMin_,
        address outReceiver_
    ) external returns (uint256 _amountOut) {
        IERC20(path_[0]).safeApprove(address(router), amountIn_);
        _amountOut = router.swapExactTokensForTokens(amountIn_, amountOutMin_, path_, outReceiver_, block.timestamp)[
            path_.length - 1
        ];
    }

    /// @inheritdoc IExchange
    function swapExactOutput(
        address[] calldata path_,
        uint256 amountOut_,
        uint256 amountInMax_,
        address inSender_,
        address outRecipient_
    ) external returns (uint256 _amountIn) {
        IERC20(path_[0]).safeApprove(address(router), amountInMax_);
        _amountIn = router.swapTokensForExactTokens(amountOut_, amountInMax_, path_, outRecipient_, block.timestamp)[0];
        // If swap end up costly less than _amountInMax then return remaining
        uint256 _remainingAmountIn = amountInMax_ - _amountIn;
        if (_remainingAmountIn > 0) {
            IERC20(path_[0]).safeTransfer(inSender_, _remainingAmountIn);
        }
    }

    /**
     * @notice Wraps `router.getAmountsOut()` function
     * @dev Returns `0` if reverts
     */
    function _getAmountsOut(uint256 amountIn_, address[] memory path_) internal view returns (uint256 _amountOut) {
        try router.getAmountsOut(amountIn_, path_) returns (uint256[] memory amounts) {
            _amountOut = amounts[path_.length - 1];
        } catch {}
    }

    /**
     * @notice Wraps `router.getAmountsIn()` function
     * @dev Returns `0` if reverts
     */
    function _getAmountsIn(uint256 _amountOut, address[] memory _path) internal view returns (uint256 _amountIn) {
        try router.getAmountsIn(_amountOut, _path) returns (uint256[] memory amounts) {
            _amountIn = amounts[0];
        } catch {}
    }

    /**
     * @notice Update WETH-Like token
     */
    function updateWethLikeToken(address wethLike_) external onlyGovernor {
        emit WethLikeTokenUpdated(wethLike, wethLike_);
        wethLike = wethLike_;
    }
}
