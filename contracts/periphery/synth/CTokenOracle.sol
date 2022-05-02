// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "../../interfaces/external/ICToken.sol";
import "../../interfaces/periphery/synth/ISynthOracle.sol";
import "../../access/Governable.sol";
import "../../libraries/OracleHelpers.sol";

/**
 * @title Oracle for `CTokens`
 */
contract CTokenOracle is ISynthOracle, Governable {
    uint256 public constant ONE_CTOKEN = 1e8;
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
        address _underlyingAddress = ICToken(address(_asset)).underlying();
        uint256 _underlyinPriceInUsd = underlyingOracle.getPriceInUsd(IERC20(_underlyingAddress));
        uint256 _underlyingAmount = OracleHelpers.scaleDecimal(
            ONE_CTOKEN * ICToken(address(_asset)).exchangeRateStored(),
            IERC20Metadata(_underlyingAddress).decimals(),
            18
        ) / 1e18;

        _priceInUsd = (_underlyinPriceInUsd * _underlyingAmount) / 1e18;
    }
}
