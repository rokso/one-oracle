// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "@prb/math/contracts/PRBMath.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "../../interfaces/periphery/synth/ISynthOracle.sol";
import "../../libraries/OracleHelpers.sol";

import "hardhat/console.sol";

/**
 * @title Oracle for UniswapV2-Like liquidity pair tokens
 * @dev See more: https://blog.alphaventuredao.io/fair-lp-token-pricing/
 */
contract UniswapV2LikePairTokenOracle is ISynthOracle {
    using OracleHelpers for uint256;
    using PRBMath for uint256;

    /**
     * @notice The oracle that resolves the price of underlying token
     */
    ISynthOracle public underlyingOracle;

    constructor(ISynthOracle _underlyingOracle) {
        underlyingOracle = _underlyingOracle;
    }

    /**
     * @notice Get cToken's USD price
     * @param _asset The asset's to get price from
     * @return _priceInUsd The amount in USD (18 decimals)
     */
    function getPriceInUsd(IERC20 _asset) external view returns (uint256 _priceInUsd) {
        IUniswapV2Pair _pair = IUniswapV2Pair(address(_asset));
        uint256 _totalSupply = _pair.totalSupply();
        (uint256 _reserve0, uint256 _reserve1, ) = _pair.getReserves();

        IERC20Metadata _token0 = IERC20Metadata(_pair.token0());
        IERC20Metadata _token1 = IERC20Metadata(_pair.token1());

        _reserve0 = OracleHelpers.scaleDecimal(_reserve0, _token0.decimals(), 18);
        _reserve1 = OracleHelpers.scaleDecimal(_reserve1, _token1.decimals(), 18);

        uint256 _token0Price = underlyingOracle.getPriceInUsd(_token0); // BTC
        // console.log("_reserve0", _reserve0); // 38661229454
        uint256 _token1Price = underlyingOracle.getPriceInUsd(_token1); // ETH
        // console.log("_reserve1", _reserve1); // 5229469835109795287187

        uint256 _sqrtK = (_reserve0 * _reserve1).sqrt();
        uint256 _sqrtP0xP1 = (_token0Price * _token1Price).sqrt();

        _priceInUsd = (2 * (_sqrtK * _sqrtP0xP1)) / _totalSupply;
    }
}
