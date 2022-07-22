// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "../interfaces/periphery/IOracle.sol";
import "../access/Governable.sol";

/**
 * @title MasterOracle
 */
contract MasterOracle is IOracle, Governable {
    /**
     * @notice Default oracle to use when token hasn't custom oracle
     */
    IOracle public defaultOracle;

    /**
     * @notice Custom tokens' oracles
     * @dev Useful when dealing with special tokens (e.g. LP, IB, etc)
     */
    mapping(address => IOracle) public oracles;

    constructor(IOracle defaultOracle_) {
        defaultOracle = defaultOracle_;
    }

    /// @inheritdoc IOracle
    function getPriceInUsd(address asset_) public view override returns (uint256 _priceInUsd) {
        IOracle _oracle = oracles[asset_];

        if (address(_oracle) == address(0)) {
            return defaultOracle.getPriceInUsd(asset_);
        }

        return _oracle.getPriceInUsd(asset_);
    }

    /// @inheritdoc IOracle
    function quote(
        address tokenIn_,
        address tokenOut_,
        uint256 amountIn_
    ) external view virtual override returns (uint256 _amountOut) {
        uint256 _amountInUsd = quoteTokenToUsd(tokenIn_, amountIn_);
        _amountOut = quoteUsdToToken(tokenOut_, _amountInUsd);
    }

    /// @inheritdoc IOracle
    function quoteTokenToUsd(address token_, uint256 amountIn_) public view override returns (uint256 _amountOut) {
        uint256 _price = getPriceInUsd(token_);
        _amountOut = (amountIn_ * _price) / 10**IERC20Metadata(token_).decimals();
    }

    /// @inheritdoc IOracle
    function quoteUsdToToken(address token_, uint256 amountIn_) public view override returns (uint256 _amountOut) {
        uint256 _price = getPriceInUsd(token_);
        _amountOut = (amountIn_ * 10**IERC20Metadata(token_).decimals()) / _price;
    }

    /// @notice Set custom oracle for a token
    function setOracle(address asset_, IOracle oracle_) external onlyGovernor {
        oracles[asset_] = oracle_;
    }

    /// @notice Update the default oracle
    function updateDefaultOracle(IOracle defaultOracle_) external onlyGovernor {
        defaultOracle = defaultOracle_;
    }
}
