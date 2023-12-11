// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "../../interfaces/periphery/ITokenOracle.sol";
import "../../interfaces/periphery/IOracle.sol";
import "../../interfaces/external/bloom/IBloomPool.sol";
import "../../interfaces/external/bloom/IExchangeRateRegistry.sol";

/**
 * @title Oracle for TBY tokens
 */
contract TBYOracle is ITokenOracle {
    uint256 public constant ONE_USD = 1e18;

    IExchangeRateRegistry public immutable exchangeRateRegistry;

    constructor(IExchangeRateRegistry exchangeRateRegistry_) {
        exchangeRateRegistry = exchangeRateRegistry_;
    }

    /**
     * Note: Until the maturity, we use the exchange rate to calculate TBY price
     * When it enters the withdraw phase, exchange rate isn't accurate because:
     * 1) Interest rate may vary and that could impact TBY price even after the maturity
     * 2) After the maturity the actual TBY price is the redeemable USDC amount
     */
    function getPriceInUsd(address token_) external view returns (uint256) {
        IBloomPool _tby = IBloomPool(token_);
        IERC20Metadata _underlying = _tby.UNDERLYING_TOKEN(); // i.e., USDC
        IOracle _masterOracle = IOracle(msg.sender);
        uint256 _underlyingPrice = _masterOracle.getPriceInUsd(address(_underlying));

        if (_tby.state() == IBloomPool.State.FinalWithdraw) {
            (, , uint128 lenderDistribution, uint128 totalLenderShares) = _tby.getDistributionInfo();
            uint256 _oneShare = 10 ** _tby.decimals();
            uint256 _underlyingAmountPerShare = (_oneShare * lenderDistribution) / totalLenderShares;
            return (_underlyingPrice * _underlyingAmountPerShare) / _underlying.decimals();
        }

        return (_underlyingPrice * exchangeRateRegistry.getExchangeRate(token_)) / ONE_USD;
    }
}
