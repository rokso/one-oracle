// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "../access/Governable.sol";
import "../libraries/OracleHelpers.sol";
import "../interfaces/core/IChainlinkPriceProvider.sol";
import "../interfaces/periphery/IOracle.sol";

/**
 * @title Main oracle
 * @dev Reuses `PriceProvidersAggregator` and add support to USD quotes
 */
contract Oracle is IOracle, Governable {
    uint256 public constant USD_DECIMALS = 18;

    /**
     * @notice A stable coin to use as USD price reference if provider is UniV2 or UniV3 (optional)
     * @dev Stable coin may lose pegging on-chain and may not be equal to $1.
     */
    address public usdEquivalentToken;
    uint8 private usdEquivalentTokenDecimals;

    /**
     * @notice The price providers aggregators contract
     */
    IPriceProvidersAggregator public providersAggregator;

    /**
     * @notice The default provider (optional)
     * @dev Set a default provider in order to call functions that don't require provider arg (e.g. Chainlink only)
     */
    DataTypes.Provider public defaultProvider;

    /// @notice Emitted when default provider is updated
    event DefaultProviderUpdated(DataTypes.Provider oldDefaultProvider, DataTypes.Provider newDefaultProvider);

    /// @notice Emitted when providers aggregator is updated
    event ProvidersAggregatorUpdated(
        IPriceProvidersAggregator oldProvidersAggregator,
        IPriceProvidersAggregator newProvidersAggregator
    );

    /// @notice Emitted when USD-Equivalent token is updated
    event UsdEquivalentTokenUpdated(address oldUsdToken, address newUsdToken);

    constructor(IPriceProvidersAggregator providersAggregator_) {
        require(address(providersAggregator_) != address(0), "aggregator-is-null");
        providersAggregator = providersAggregator_;
    }

    /// @inheritdoc IOracle
    function quote(
        DataTypes.Provider provider_,
        address tokenIn_,
        address tokenOut_,
        uint256 amountIn_
    ) external view returns (uint256 _amountOut, uint256 _lastUpdatedAt) {
        return providersAggregator.quote(provider_, tokenIn_, tokenOut_, amountIn_);
    }

    /// @inheritdoc IOracle
    function quote(
        DataTypes.Provider providerIn_,
        address tokenIn_,
        DataTypes.Provider providerOut_,
        address tokenOut_,
        uint256 amountIn_
    ) external view returns (uint256 _amountOut, uint256 _lastUpdatedAt) {
        return providersAggregator.quote(providerIn_, tokenIn_, providerOut_, tokenOut_, amountIn_);
    }

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
        DataTypes.Provider provider_,
        address token_,
        uint256 amountIn_
    ) public view returns (uint256 _amountOut, uint256 _lastUpdatedAt) {
        require(token_ != address(0), "token-is-null");
        require(provider_ != DataTypes.Provider.NONE, "not-supported");

        if (usdEquivalentToken == token_) {
            _amountOut = OracleHelpers.scaleDecimal(amountIn_, usdEquivalentTokenDecimals, USD_DECIMALS);
            return (_amountOut, block.timestamp);
        }

        if (provider_ == DataTypes.Provider.CHAINLINK) {
            return
                IChainlinkPriceProvider(address(providersAggregator.priceProviders(DataTypes.Provider.CHAINLINK)))
                    .quoteTokenToUsd(token_, amountIn_);
        }

        require(usdEquivalentToken != address(0), "not-supported");

        (_amountOut, _lastUpdatedAt) = providersAggregator.quote(provider_, token_, usdEquivalentToken, amountIn_);

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
        DataTypes.Provider provider_,
        address token_,
        uint256 amountIn_
    ) public view returns (uint256 _amountOut, uint256 _lastUpdatedAt) {
        require(token_ != address(0), "token-is-null");
        require(provider_ != DataTypes.Provider.NONE, "not-supported");

        if (usdEquivalentToken == token_) {
            _amountOut = OracleHelpers.scaleDecimal(amountIn_, USD_DECIMALS, usdEquivalentTokenDecimals);

            return (_amountOut, block.timestamp);
        }

        if (provider_ == DataTypes.Provider.CHAINLINK) {
            return
                IChainlinkPriceProvider(address(providersAggregator.priceProviders(DataTypes.Provider.CHAINLINK)))
                    .quoteUsdToToken(token_, amountIn_);
        }

        require(usdEquivalentToken != address(0), "not-supported");

        uint256 _amountIn = OracleHelpers.scaleDecimal(amountIn_, USD_DECIMALS, usdEquivalentTokenDecimals);

        (_amountOut, _lastUpdatedAt) = providersAggregator.quote(provider_, usdEquivalentToken, token_, _amountIn);
    }

    /// @inheritdoc IOracle
    function setUSDEquivalentToken(address usdEquivalentToken_) external onlyGovernor {
        usdEquivalentToken = usdEquivalentToken_;
        emit UsdEquivalentTokenUpdated(usdEquivalentToken, usdEquivalentToken_);
        if (usdEquivalentToken_ == address(0)) {
            usdEquivalentTokenDecimals = 0;
        } else {
            usdEquivalentTokenDecimals = IERC20Metadata(usdEquivalentToken).decimals();
        }
    }

    /// @inheritdoc IOracle
    function setDefaultProvider(DataTypes.Provider defaultProvider_) external onlyGovernor {
        emit DefaultProviderUpdated(defaultProvider, defaultProvider_);
        defaultProvider = defaultProvider_;
    }

    /// @inheritdoc IOracle
    function updateProvidersAggregator(IPriceProvidersAggregator providersAggregator_) external onlyGovernor {
        require(address(providersAggregator_) != address(0), "address-is-null");
        emit ProvidersAggregatorUpdated(providersAggregator, providersAggregator_);
        providersAggregator = providersAggregator_;
    }
}
