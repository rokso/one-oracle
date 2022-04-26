// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "../libraries/OracleHelpers.sol";
import "../interfaces/core/IChainlinkPriceProvider.sol";
import "../interfaces/periphery/IOracle.sol";
import "../core/PriceProvidersAggregator.sol";

/**
 * @title Main oracle
 * @dev Extends `PriceProvidersAggregator` and add support to USD quotes
 */
contract Oracle is IOracle, PriceProvidersAggregator {
    uint256 public constant USD_DECIMALS = 18;

    /**
     * @notice A stable coin to use as USD price reference if provider is UniV2 or UniV3 (optional)
     * @dev Stable coin may lose pegging on-chain and may not be equal to $1.
     */
    address public usdEquivalentToken;
    uint8 private usdEquivalentTokenDecimals;

    /**
     * @notice The default provider (optional)
     * @dev Set a default provider in order to call functions that don't require provider arg (e.g. Chainlink only)
     */
    Provider public defaultProvider;

    constructor(address nativeToken_) PriceProvidersAggregator(nativeToken_) {}

    /// @inheritdoc IOracle
    function quoteTokenToUsd(address token_, uint256 amountIn_)
        external
        view
        returns (uint256 _amountOut, uint256 _lastUpdatedAt)
    {
        return quoteTokenToUsd(defaultProvider, token_, amountIn_);
    }

    /// @inheritdoc IOracle
    function quoteTokenToUsd(
        Provider provider_,
        address token_,
        uint256 amountIn_
    ) public view returns (uint256 _amountOut, uint256 _lastUpdatedAt) {
        require(token_ != address(0), "token-is-null");
        require(provider_ != Provider.NONE, "not-supported");

        if (usdEquivalentToken == token_) {
            _amountOut = OracleHelpers.scaleDecimal(amountIn_, usdEquivalentTokenDecimals, USD_DECIMALS);
            return (_amountOut, block.timestamp);
        }

        IPriceProvider _priceProvider = priceProviders[provider_];
        require(address(_priceProvider) != address(0), "provider-not-set");

        if (provider_ == Provider.CHAINLINK) {
            return IChainlinkPriceProvider(address(_priceProvider)).quoteTokenToUsd(token_, amountIn_);
        }

        require(usdEquivalentToken != address(0), "not-supported");

        (_amountOut, _lastUpdatedAt) = _priceProvider.quote(token_, usdEquivalentToken, amountIn_);

        _amountOut = OracleHelpers.scaleDecimal(_amountOut, usdEquivalentTokenDecimals, USD_DECIMALS);
    }

    /// @inheritdoc IOracle
    function quoteUsdToToken(address token_, uint256 amountIn_)
        external
        view
        returns (uint256 _amountOut, uint256 _lastUpdatedAt)
    {
        return quoteUsdToToken(defaultProvider, token_, amountIn_);
    }

    /// @inheritdoc IOracle
    function quoteUsdToToken(
        Provider provider_,
        address token_,
        uint256 amountIn_
    ) public view returns (uint256 _amountOut, uint256 _lastUpdatedAt) {
        require(token_ != address(0), "token-is-null");
        require(provider_ != Provider.NONE, "not-supported");

        if (usdEquivalentToken == token_) {
            _amountOut = OracleHelpers.scaleDecimal(amountIn_, USD_DECIMALS, usdEquivalentTokenDecimals);

            return (_amountOut, block.timestamp);
        }

        IPriceProvider _priceProvider = priceProviders[provider_];
        require(address(_priceProvider) != address(0), "provider-not-set");

        if (provider_ == Provider.CHAINLINK) {
            return IChainlinkPriceProvider(address(_priceProvider)).quoteUsdToToken(token_, amountIn_);
        }

        require(usdEquivalentToken != address(0), "not-supported");

        uint256 _amountIn = OracleHelpers.scaleDecimal(amountIn_, USD_DECIMALS, usdEquivalentTokenDecimals);

        (_amountOut, _lastUpdatedAt) = _priceProvider.quote(usdEquivalentToken, token_, _amountIn);
    }

    /// @inheritdoc IOracle
    function setUSDEquivalentToken(address usdEquivalentToken_) external onlyGovernor {
        usdEquivalentToken = usdEquivalentToken_;
        if (usdEquivalentToken_ == address(0)) {
            usdEquivalentTokenDecimals = 0;
        } else {
            usdEquivalentTokenDecimals = IERC20Metadata(usdEquivalentToken).decimals();
        }
    }

    /// @inheritdoc IOracle
    function setDefaultProvider(Provider defaultProvider_) external onlyGovernor {
        defaultProvider = defaultProvider_;
    }
}
