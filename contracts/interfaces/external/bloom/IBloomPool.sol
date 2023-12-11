// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

interface IBloomPool is IERC20Metadata {
    enum State {
        Other,
        Commit,
        ReadyPreHoldSwap,
        PendingPreHoldSwap,
        Holding,
        ReadyPostHoldSwap,
        PendingPostHoldSwap,
        EmergencyExit,
        FinalWithdraw
    }

    function POOL_PHASE_END() external view returns (uint256);

    function state() external view returns (State);

    function getDistributionInfo()
        external
        view
        returns (
            uint128 borrowerDistribution,
            uint128 totalBorrowerShares,
            uint128 lenderDistribution,
            uint128 totalLenderShares
        );

    function UNDERLYING_TOKEN() external view returns (IERC20Metadata);
}
