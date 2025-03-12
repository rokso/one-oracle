// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

interface IERC4626 is IERC20Metadata {
    function asset() external view returns (address);

    function convertToAssets(uint256 shares) external view returns (uint256 assets);
}
