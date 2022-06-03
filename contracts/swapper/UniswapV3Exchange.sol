// SPDX-License-Identifier: MIT

pragma solidity >=0.7.6;
pragma abicoder v2;

import "@openzeppelin/contracts-v3.4.2-solc-0.7/token/ERC20/SafeERC20.sol";
import "@uniswap/v3-periphery/contracts/interfaces/IQuoter.sol";
import "@uniswap/v3-periphery/contracts/libraries/PoolAddress.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@uniswap/v3-periphery/contracts/libraries/Path.sol";
import "../interfaces/swapper/IExchange.sol";

/**
 * @title UniswapV3 Exchange
 */
contract UniswapV3Exchange is IExchange {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;
    using SafeMath for uint24;
    using Path for bytes;

    IQuoter internal constant QUOTER = IQuoter(0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6);
    ISwapRouter internal constant UNI3_ROUTER = ISwapRouter(0xE592427A0AEce92De3Edee1F18E0157C05861564);
    uint24 public constant POOL_FEE_BPS = 1_000_000;
    address public constant UNISWAP_V3_FACTORY = 0x1F98431c8aD98523631AE4a59f267346ea31F984;

    address public immutable wethLike;
    uint24 public defaultPoolFee = 3000; // 0.3%

    /**
     * @dev Doesn't consider router.WETH() as `wethLike` because isn't guaranteed that it's the most liquid token.
     * For instance: On Polygon, the `WETH` is more liquid than `WMATIC` on UniV3 protocol.
     */
    constructor(address wethLike_) {
        wethLike = wethLike_;
    }

    /// @inheritdoc IExchange
    function getBestAmountIn(
        address tokenIn_,
        address tokenOut_,
        uint256 amountOut_
    ) external override returns (uint256 _amountIn, bytes memory _path) {
        // 1. Check IN-OUT pair
        bytes memory _pathA = abi.encodePacked(tokenOut_, defaultPoolFee, tokenIn_);
        uint256 _amountInA = getAmountsIn(amountOut_, _pathA);

        if (tokenIn_ == wethLike || tokenOut_ == wethLike) {
            // Returns if one of the token is WETH-Like
            require(_amountInA > 0, "invalid-swap");
            return (_amountInA, _pathA);
        }

        // 2. Check IN-WETH-OUT path
        bytes memory _pathB = abi.encodePacked(tokenOut_, defaultPoolFee, wethLike, defaultPoolFee, tokenIn_);
        uint256 _amountInB = getAmountsIn(amountOut_, _pathB);

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
    ) external override returns (uint256 _amountOut, bytes memory _path) {
        // 1. Check IN-OUT pair
        bytes memory _pathA = abi.encodePacked(tokenIn_, defaultPoolFee, tokenOut_);
        uint256 _amountOutA = getAmountsOut(amountIn_, _pathA);

        if (tokenIn_ == wethLike || tokenOut_ == wethLike) {
            // Returns if one of the token is WETH-Like
            require(_amountOutA > 0, "invalid-swap1");
            return (_amountOutA, _pathA);
        }

        // 2. Check IN-WETH-OUT path
        bytes memory _pathB = abi.encodePacked(tokenIn_, defaultPoolFee, wethLike, defaultPoolFee, tokenOut_);
        uint256 _amountOutB = getAmountsOut(amountIn_, _pathB);

        // 3. Get best route between paths A and B
        require(_amountOutA > 0 || _amountOutB > 0, "invalid-swap2");
        if (_amountOutA > _amountOutB) return (_amountOutA, _pathA);
        return (_amountOutB, _pathB);
    }

    function getAmountsIn(uint256 amountOut_, bytes memory path_) public returns (uint256 _amountIn) {
        try QUOTER.quoteExactOutput(path_, amountOut_) returns (uint256 __amountIn) {
            _amountIn = __amountIn;
        } catch {}
    }

    function getAmountsOut(uint256 amountIn_, bytes memory path_) public returns (uint256 _amountOut) {
        try QUOTER.quoteExactInput(path_, amountIn_) returns (uint256 __amountOut) {
            _amountOut = __amountOut;
        } catch {}
    }

    /// @inheritdoc IExchange
    function swapExactInput(
        bytes calldata path_,
        uint256 amountIn_,
        uint256 amountOutMin_,
        address outReceiver_
    ) external override returns (uint256 _amountOut) {
        ISwapRouter.ExactInputParams memory params = ISwapRouter.ExactInputParams({
            path: path_,
            recipient: outReceiver_,
            deadline: block.timestamp,
            amountIn: amountIn_,
            amountOutMinimum: amountOutMin_
        });

        (address _tokenInAddress, , ) = path_.decodeFirstPool();
        IERC20(_tokenInAddress).safeApprove(address(UNI3_ROUTER), amountIn_);
        _amountOut = UNI3_ROUTER.exactInput(params);
    }

    /// @inheritdoc IExchange
    function swapExactOutput(
        bytes calldata path_,
        uint256 amountOut_,
        uint256 amountInMax_,
        address remainingReceiver_,
        address outReceiver_
    ) external override returns (uint256 _amountIn) {
        address _tokenInAddress;
        if (path_.numPools() == 1) {
            (, _tokenInAddress, ) = path_.decodeFirstPool();
        } else if (path_.numPools() == 2) {
            (, _tokenInAddress, ) = path_.skipToken().decodeFirstPool();
        } else {
            revert("invalid-path-length");
        }

        IERC20 _tokenIn = IERC20(_tokenInAddress);
        _tokenIn.safeApprove(address(UNI3_ROUTER), 0);
        _tokenIn.safeApprove(address(UNI3_ROUTER), amountInMax_);

        ISwapRouter.ExactOutputParams memory params = ISwapRouter.ExactOutputParams({
            path: path_,
            recipient: outReceiver_,
            deadline: block.timestamp,
            amountOut: amountOut_,
            amountInMaximum: amountInMax_
        });

        _amountIn = UNI3_ROUTER.exactOutput(params);

        // If swap end up costly less than _amountInMax then return remaining to caller
        uint256 _remainingAmountIn = _tokenIn.balanceOf(address(this));
        if (_remainingAmountIn > 0) {
            _tokenIn.safeTransfer(remainingReceiver_, _remainingAmountIn);
        }
    }
}
