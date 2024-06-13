// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "../../interfaces/periphery/ITokenOracle.sol";
import "../../interfaces/external/curve/ICurveAddressProvider.sol";
import "../../interfaces/external/curve/ICurveMetaRegistry.sol";
import "../../interfaces/external/curve/ICurvePool.sol";
import "../../interfaces/periphery/IOracle.sol";
import "../../access/Governable.sol";

/**
 * @title Oracle for Curve LP tokens
 */
contract CurveLpTokenOracleV2 is ITokenOracle, Governable {
    /// @dev Same address for all chains
    ICurveAddressProvider public constant curveAddressProvider =
        ICurveAddressProvider(0x0000000022D53366457F9d5E68Ec105046FC4383);

    address internal constant ETH = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    address internal immutable weth;

    uint256 private constant META_REGISTRY_ADDRESS_ID = 7;

    /// @notice LP token => coins mapping
    mapping(address => address[]) public underlyingTokens;

    /// @notice LP token => pool
    mapping(address => address) public poolOf;

    /// @notice Emitted when a LP token is registered
    event LpRegistered(address indexed lpToken);

    constructor(address weth_) {
        require(weth_ != address(0), "null-weth");
        weth = weth_;
    }

    /// @inheritdoc ITokenOracle
    /// @dev This function is supposed to be called from `MasterOracle` only
    function getPriceInUsd(address lpToken_) external view override returns (uint256 _priceInUsd) {
        address _pool = poolOf[lpToken_];
        require(_pool != address(0), "lp-is-not-registered");
        address[] memory _tokens = underlyingTokens[lpToken_];
        uint256 _min = type(uint256).max;
        uint256 _n = _tokens.length;

        for (uint256 i; i < _n; i++) {
            // Note: `msg.sender` is the `MasterOracle` contract
            uint256 _price = IOracle(msg.sender).getPriceInUsd(_tokens[i]);
            if (_price < _min) _min = _price;
        }

        require(_min < type(uint256).max, "no-min-underlying-price-found");
        require(_min > 0, "invalid-min-price");

        return (_min * ICurvePool(_pool).get_virtual_price()) / 1e18;
    }

    /// @notice Check if a token is already registered
    function isLpRegistered(address lpToken_) public view returns (bool) {
        return underlyingTokens[lpToken_].length > 0;
    }

    /// @notice Register LP token data
    function registerLp(address lpToken_) external onlyGovernor {
        require(!isLpRegistered(lpToken_), "lp-already-registered");

        ICurveMetaRegistry _registry = ICurveMetaRegistry(curveAddressProvider.get_address(META_REGISTRY_ADDRESS_ID));

        address _pool = _registry.get_pool_from_lp_token(lpToken_);
        require(_pool != address(0), "invalid-lp-token");

        if (poolOf[lpToken_] != address(0)) {
            // Clean current tokens if LP exists
            delete underlyingTokens[lpToken_];
        }
        poolOf[lpToken_] = _pool;

        address[8] memory _tokens = _registry.get_underlying_coins(_pool);

        // Due to issue here https://github.com/curvefi/metaregistry/issues/25
        // we are using address(0) check to break out and not using below line to get exact coin count.
        // uint256 _noOfCoins = _registry.get_n_underlying_coins(_pool);
        for (uint256 i; i < 8; i++) {
            if (_tokens[i] == address(0)) {
                break;
            }
            if (_tokens[i] == ETH) {
                underlyingTokens[lpToken_].push(weth);
            } else {
                underlyingTokens[lpToken_].push(_tokens[i]);
            }
        }

        emit LpRegistered(lpToken_);
    }
}
