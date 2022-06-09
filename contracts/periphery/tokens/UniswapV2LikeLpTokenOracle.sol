// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "@prb/math/contracts/PRBMath.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "../../interfaces/periphery/IOracle.sol";
import "../../interfaces/periphery/ITokenOracle.sol";
import "../../libraries/OracleHelpers.sol";

/**
 * @title Oracle for UniswapV2-Like liquidity pair tokens
 * @dev See more: https://blog.alphaventuredao.io/fair-lp-token-pricing/
 */
contract UniswapV2LikeLpTokenOracle is ITokenOracle {
    using OracleHelpers for uint256;
    using PRBMath for uint256;

    /**
     * @notice The oracle that resolves the price of underlying token
     */
    IOracle public immutable underlyingOracle;

    constructor(IOracle _underlyingOracle) {
        underlyingOracle = _underlyingOracle;
    }

    /// @inheritdoc ITokenOracle
    function getPriceInUsd(address _asset) external view returns (uint256 _priceInUsd) {
        IUniswapV2Pair _pair = IUniswapV2Pair(address(_asset));
        (uint256 _reserve0, uint256 _reserve1, ) = _pair.getReserves();

        address _token0 = _pair.token0();
        address _token1 = _pair.token1();

        _reserve0 = OracleHelpers.scaleDecimal(_reserve0, IERC20Metadata(_token0).decimals(), 18);
        _reserve1 = OracleHelpers.scaleDecimal(_reserve1, IERC20Metadata(_token1).decimals(), 18);

        uint256 _token0Price = underlyingOracle.getPriceInUsd(_token0);
        uint256 _token1Price = underlyingOracle.getPriceInUsd(_token1);

        uint256 _sqrtK = (_reserve0 * _reserve1).sqrt();
        uint256 _sqrtP0xP1 = (_token0Price * _token1Price).sqrt();

        _priceInUsd = (2 * (_sqrtK * _sqrtP0xP1)) / _pair.totalSupply();
    }
}
