// SPDX-License-Identifier: MIT

pragma solidity >=0.7.6;
pragma abicoder v2;

import "@openzeppelin/contracts-v3.4.2-solc-0.7/token/ERC20/SafeERC20.sol";
import "@uniswap/v3-core/contracts/interfaces/pool/IUniswapV3PoolState.sol";
import "@uniswap/v3-core/contracts/libraries/FullMath.sol";
import "@uniswap/v3-periphery/contracts/libraries/PoolAddress.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "../interfaces/swapper/IExchange.sol";
import "../libraries/SafeUint128.sol";

/**
 * @title UniswapV3 Exchange
 * @dev Unlike UniswapV2, the UniswapV3 doesn't have a straightforward way to get the spot price (a.k.a. quote) from a pool
 * They have a [`Quoter`](https://github.com/Uniswap/v3-periphery/blob/main/contracts/lens/Quoter.sol) contract that isn't supposed to be called on-chain
 * because it is too costly (it actually executes a failed swap and get quote values from revert message).
 * The workaround for that was to cat approximated quote value by doing some math, the logic was extracted from
 * [here](https://github.com/ApeX-Protocol/periphery/blob/1e397da4d027b452f00ad4ca5792524c81141ff8/contracts/bonding/BondPriceOracle.sol#L66)
 * and [here](https://github.com/sohkai/multiprice-oracle/blob/9baf62cb620005fc7a3e427911fce2406c7d26a1/packages/evm/contracts/MultipriceOracle.sol#L228)
 * this workaround solutions has two limitations 1) The price isn't accurate and  2) The value returned disconsider the pool liquidity and amounts don't move depending on the amount swapped.
 * This latter limitation was the reason why we aren't checking `tokenA-tokenB` pair if none of the token is `wethLike`.
 * Always checking the `token-weth` or token-weth-token` paths will increase the chance to have higher liquidity.
 * In order to mitigate this issue (i.e. too basic `getBestAmount` logic) we may implement a way for the `governor` to set preferable path
 * that will have precedence when querying and swapping (See more: https://github.com/bloqpriv/one-oracle/issues/95).
 */
// TODO: Missing comments
contract UniswapV3Exchange is IExchange {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;
    using SafeMath for uint24;

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
    /// @dev Returns IN-OUT path if one of the tokens is WETH, otherwise returns IN-WETH-OUT path
    function getBestAmountIn(
        address tokenIn_,
        address tokenOut_,
        uint256 amountOut_
    ) external view override returns (uint256 _amountIn, address[] memory _path) {
        if (tokenIn_ == wethLike || tokenOut_ == wethLike) {
            _path = new address[](2);
            _path[0] = tokenIn_;
            _path[1] = tokenOut_;

            _amountIn = getAmountsIn(amountOut_, _path);

            require(_amountIn > 0, "invalid-swap");
            return (_amountIn, _path);
        }

        _path = new address[](3);
        _path[0] = tokenIn_;
        _path[1] = wethLike;
        _path[2] = tokenOut_;
        _amountIn = getAmountsIn(amountOut_, _path);

        require(_amountIn > 0, "invalid-swap");
    }

    /// @inheritdoc IExchange
    /// @dev Returns IN-OUT path if one of the tokens is WETH, otherwise returns IN-WETH-OUT path
    function getBestAmountOut(
        address tokenIn_,
        address tokenOut_,
        uint256 amountIn_
    ) external view override returns (uint256 _amountOut, address[] memory _path) {
        if (tokenIn_ == wethLike || tokenOut_ == wethLike) {
            _path = new address[](2);
            _path[0] = tokenIn_;
            _path[1] = tokenOut_;
            _amountOut = getAmountsOut(amountIn_, _path);

            require(_amountOut > 0, "invalid-swap");
            return (_amountOut, _path);
        }

        _path = new address[](3);
        _path[0] = tokenIn_;
        _path[1] = wethLike;
        _path[2] = tokenOut_;
        _amountOut = getAmountsOut(amountIn_, _path);

        require(_amountOut > 0, "invalid-swap");
    }

    function getAmountsOut(uint256 amountIn_, address[] memory path_) public view returns (uint256 _amountOut) {
        if (path_.length == 2) {
            return _getAmountOut(path_[0], defaultPoolFee, path_[1], amountIn_);
        } else if (path_.length == 3) {
            uint256 _ethAmount = _getAmountOut(path_[0], defaultPoolFee, path_[1], amountIn_);
            return _getAmountOut(path_[1], defaultPoolFee, path_[2], _ethAmount);
        }

        revert("invalid-path");
    }

    function getAmountsIn(uint256 amountOut_, address[] memory path_) public view returns (uint256 _amountIn) {
        if (path_.length == 2) {
            return _getAmountIn(path_[0], defaultPoolFee, path_[1], amountOut_);
        } else if (path_.length == 3) {
            uint256 _ethAmount = _getAmountIn(path_[1], defaultPoolFee, path_[2], amountOut_);
            return _getAmountIn(path_[0], defaultPoolFee, path_[1], _ethAmount);
        }
        revert("invalid-path");
    }

    /// @inheritdoc IExchange
    function swapExactInput(
        address[] calldata path_,
        uint256 amountIn_,
        uint256 amountOutMin_,
        address outReceiver_
    ) external override returns (uint256 _amountOut) {
        bytes memory _path;
        if (path_.length == 2) {
            _path = abi.encodePacked(path_[0], defaultPoolFee, path_[1]);
        } else if (path_.length == 3) {
            _path = abi.encodePacked(path_[0], defaultPoolFee, path_[1], defaultPoolFee, path_[2]);
        } else {
            revert("invalid-path");
        }

        ISwapRouter.ExactInputParams memory params = ISwapRouter.ExactInputParams({
            path: _path,
            recipient: outReceiver_,
            deadline: block.timestamp,
            amountIn: amountIn_,
            amountOutMinimum: amountOutMin_
        });

        IERC20(path_[0]).safeApprove(address(UNI3_ROUTER), amountIn_);
        _amountOut = UNI3_ROUTER.exactInput(params);
    }

    /// @inheritdoc IExchange
    function swapExactOutput(
        address[] calldata path_,
        uint256 amountOut_,
        uint256 amountInMax_,
        address remainingReceiver_,
        address outReceiver_
    ) external override returns (uint256 _amountIn) {
        IERC20 _tokenIn = IERC20(path_[0]);
        _tokenIn.safeApprove(address(UNI3_ROUTER), 0);
        _tokenIn.safeApprove(address(UNI3_ROUTER), amountInMax_);

        bytes memory _path;
        if (path_.length == 2) {
            _path = abi.encodePacked(path_[1], defaultPoolFee, path_[0]);
        } else if (path_.length == 3) {
            _path = abi.encodePacked(path_[2], defaultPoolFee, path_[1], defaultPoolFee, path_[0]);
        } else {
            revert("invalid-path");
        }

        ISwapRouter.ExactOutputParams memory params = ISwapRouter.ExactOutputParams({
            path: _path,
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

    function _getAmountOut(
        address tokenIn_,
        uint24 poolFee_,
        address tokenOut_,
        uint256 amountIn_
    ) private view returns (uint256 _amountOut) {
        amountIn_ = FullMath.mulDivRoundingUp(amountIn_, POOL_FEE_BPS - poolFee_, POOL_FEE_BPS);

        address _pool = PoolAddress.computeAddress(
            UNISWAP_V3_FACTORY,
            PoolAddress.getPoolKey(tokenIn_, tokenOut_, poolFee_)
        );

        if (!Address.isContract(_pool)) {
            return 0;
        }

        (uint160 _sqrtPriceX96, , , , , , ) = IUniswapV3PoolState(_pool).slot0();

        uint256 _priceX128 = FullMath.mulDiv(_sqrtPriceX96, _sqrtPriceX96, 1 << 64);

        if (tokenIn_ < tokenOut_) {
            _amountOut = FullMath.mulDiv(_priceX128, amountIn_, 1 << 128);
        } else {
            _amountOut = FullMath.mulDiv(1 << 128, amountIn_, _priceX128);
        }
    }

    function _getAmountIn(
        address tokenIn_,
        uint24 poolFee_,
        address tokenOut_,
        uint256 amountOut_
    ) private view returns (uint256 _amountIn) {
        amountOut_ = FullMath.mulDivRoundingUp(amountOut_, POOL_FEE_BPS + poolFee_, POOL_FEE_BPS);

        address _pool = PoolAddress.computeAddress(
            UNISWAP_V3_FACTORY,
            PoolAddress.getPoolKey(tokenIn_, tokenOut_, poolFee_)
        );

        if (!Address.isContract(_pool)) {
            return 0;
        }

        (uint160 _sqrtPriceX96, , , , , , ) = IUniswapV3PoolState(_pool).slot0();

        uint256 _priceX128 = FullMath.mulDiv(_sqrtPriceX96, _sqrtPriceX96, 1 << 64);

        if (tokenIn_ > tokenOut_) {
            return FullMath.mulDiv(_priceX128, amountOut_, 1 << 128);
        } else {
            return FullMath.mulDiv(1 << 128, amountOut_, _priceX128);
        }
    }
}
