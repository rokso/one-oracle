// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "@openzeppelin/contracts/utils/math/SafeCast.sol";
import "../access/Governable.sol";
import "../interfaces/utils/IUniswapV3CrossPoolOracle.sol";
import "../interfaces/core/IUniswapV3PriceProvider.sol";

contract UniswapV3PriceProvider is IUniswapV3PriceProvider, Governable {
    /**
     * @notice The UniswapV3CrossPoolOracle contract
     * @dev This contract encapsulates UniswapV3 oracle logic
     */
    IUniswapV3CrossPoolOracle public immutable crossPoolOracle;

    /**
     * @notice The time-weighted average price (TWAP) period
     * @dev See more: https://docs.uniswap.org/protocol/concepts/V3-overview/oracle
     */
    uint32 public override defaultTwapPeriod;

    /**
     * @notice The default pool fee to use
     * @dev Use 1e6 for 100% (e.g 3000 is 0.3%)
     */
    uint24 public defaultPoolFee;

    /// @notice Emitted when the default TWAP period is updated
    event DefaultTwapPeriodUpdated(uint32 oldDefaultTwapPeriod, uint32 newDefaultTwapPeriod);

    /// @notice Emitted when the default pool fee updated
    event DefaultPoolFeeUpdated(uint24 oldDefaultPoolFee, uint24 newDefaultPoolFee);

    constructor(
        IUniswapV3CrossPoolOracle crossPoolOracle_,
        uint32 defaultTwapPeriod_,
        uint24 defaultFee_
    ) {
        require(address(crossPoolOracle_) != address(0), "cross-pool-is-null");
        crossPoolOracle = crossPoolOracle_;
        defaultTwapPeriod = defaultTwapPeriod_;
        defaultPoolFee = defaultFee_;
    }

    /// @inheritdoc IPriceProvider
    function quote(
        address tokenIn_,
        address tokenOut_,
        uint256 amountIn_
    ) external view override returns (uint256 _amountOut, uint256 _lastUpdatedAt) {
        return quote(tokenIn_, tokenOut_, defaultPoolFee, defaultTwapPeriod, amountIn_);
    }

    /// @inheritdoc IUniswapV3PriceProvider
    function quote(
        address tokenIn_,
        address tokenOut_,
        uint32 twapPeriod_,
        uint256 amountIn_
    ) external view override returns (uint256 _amountOut, uint256 _lastUpdatedAt) {
        return quote(tokenIn_, tokenOut_, defaultPoolFee, twapPeriod_, amountIn_);
    }

    /// @inheritdoc IUniswapV3PriceProvider
    function quote(
        address tokenIn_,
        address tokenOut_,
        uint24 poolFee_,
        uint256 amountIn_
    ) external view override returns (uint256 _amountOut, uint256 _lastUpdatedAt) {
        return quote(tokenIn_, tokenOut_, poolFee_, defaultTwapPeriod, amountIn_);
    }

    /// @inheritdoc IUniswapV3PriceProvider
    function quote(
        address tokenIn_,
        address tokenOut_,
        uint24 poolFee_,
        uint32 twapPeriod_,
        uint256 amountIn_
    ) public view override returns (uint256 _amountOut, uint256 _lastUpdatedAt) {
        if (tokenIn_ == tokenOut_) {
            return (amountIn_, block.timestamp);
        }

        if (tokenIn_ == crossPoolOracle.nativeToken()) {
            _amountOut = crossPoolOracle.ethToAsset(amountIn_, tokenOut_, poolFee_, twapPeriod_);
        } else if (tokenOut_ == crossPoolOracle.nativeToken()) {
            _amountOut = crossPoolOracle.assetToEth(tokenIn_, amountIn_, poolFee_, twapPeriod_);
        } else {
            _amountOut = crossPoolOracle.assetToAsset(tokenIn_, amountIn_, tokenOut_, poolFee_, twapPeriod_);
        }
        _lastUpdatedAt = block.timestamp;
    }

    /// @inheritdoc IUniswapV3PriceProvider
    function updateDefaultTwapPeriod(uint32 newDefaultTwapPeriod_) public onlyGovernor {
        emit DefaultTwapPeriodUpdated(defaultTwapPeriod, newDefaultTwapPeriod_);
        defaultTwapPeriod = newDefaultTwapPeriod_;
    }

    /// @inheritdoc IUniswapV3PriceProvider
    function updateDefaultPoolFee(uint24 newDefaultPoolFee_) public onlyGovernor {
        emit DefaultPoolFeeUpdated(defaultPoolFee, newDefaultPoolFee_);
        defaultPoolFee = newDefaultPoolFee_;
    }
}
