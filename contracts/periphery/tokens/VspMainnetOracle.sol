// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "../../access/Governable.sol";
import "../../features/UsingMaxDeviation.sol";
import "../../features/UsingStalePeriod.sol";
import "../../interfaces/core/IChainlinkPriceProvider.sol";
import "../../interfaces/core/IPriceProvidersAggregator.sol";
import "../../interfaces/periphery/IVSPOracle.sol";

/**
 * @title Main oracle
 * @dev Reuses `PriceProvidersAggregator` and add support to USD quotes
 */
contract VspMainnetOracle is IVSPOracle, UsingMaxDeviation, UsingStalePeriod {
    uint256 public constant USD_DECIMALS = 18;
    uint256 public constant ONE_VSP = 1e18;
    address public constant VSP_ADDRESS = 0x1b40183EFB4Dd766f11bDa7A7c3AD8982e998421;

    /**
     * @notice A stable coin to use as USD price reference if provider is UniV2 or UniV3
     * @dev Stable coin may lose pegging on-chain and may not be equal to $1.
     */
    address public usdEquivalentToken;
    uint8 private usdEquivalentTokenDecimals;

    /**
     * @notice The price providers aggregators contract
     */
    IPriceProvidersAggregator public providersAggregator;

    /// @notice Emitted when providers aggregator is updated
    event ProvidersAggregatorUpdated(
        IPriceProvidersAggregator oldProvidersAggregator,
        IPriceProvidersAggregator newProvidersAggregator
    );

    /// @notice Emitted when USD-Equivalent token is updated
    event UsdEquivalentTokenUpdated(address oldUsdToken, address newUsdToken);

    constructor(
        IPriceProvidersAggregator providersAggregator_,
        address usdEquivalentToken_,
        uint256 maxDeviation_,
        uint256 stalePeriod_
    ) UsingMaxDeviation(maxDeviation_) UsingStalePeriod(stalePeriod_) {
        require(address(providersAggregator_) != address(0), "aggregator-is-null");
        providersAggregator = providersAggregator_;
        setUSDEquivalentToken(usdEquivalentToken_);
    }

    /// @inheritdoc IUSDOracle
    function getPriceInUsd(IERC20 _asset) external view returns (uint256 _priceInUsd) {
        require(address(_asset) == VSP_ADDRESS, "invalid-token");
        uint256 _lastUpdatedAt;
        (_priceInUsd, _lastUpdatedAt) = providersAggregator.quote(
            DataTypes.Provider.UNISWAP_V2,
            VSP_ADDRESS,
            usdEquivalentToken,
            ONE_VSP
        );
        (uint256 _priceInUsd1, uint256 _lastUpdatedAt1) = providersAggregator.quote(
            DataTypes.Provider.SUSHISWAP,
            VSP_ADDRESS,
            usdEquivalentToken,
            ONE_VSP
        );

        require(
            _priceInUsd > 0 && _priceInUsd1 > 0 && !_priceIsStale(Math.min(_lastUpdatedAt, _lastUpdatedAt1)),
            "one-or-both-prices-invalid"
        );
        require(_isDeviationOK(_priceInUsd, _priceInUsd1), "prices-deviation-too-high");
    }

    /// @inheritdoc IVSPOracle
    function setUSDEquivalentToken(address usdEquivalentToken_) public onlyGovernor {
        require(usdEquivalentToken_ != address(0), "address-is-null");
        usdEquivalentToken = usdEquivalentToken_;
        emit UsdEquivalentTokenUpdated(usdEquivalentToken, usdEquivalentToken_);
        if (usdEquivalentToken_ == address(0)) {
            usdEquivalentTokenDecimals = 0;
        } else {
            usdEquivalentTokenDecimals = IERC20Metadata(usdEquivalentToken).decimals();
        }
    }

    /// @inheritdoc IVSPOracle
    function updateProvidersAggregator(IPriceProvidersAggregator providersAggregator_) external onlyGovernor {
        require(address(providersAggregator_) != address(0), "address-is-null");
        emit ProvidersAggregatorUpdated(providersAggregator, providersAggregator_);
        providersAggregator = providersAggregator_;
    }
}
