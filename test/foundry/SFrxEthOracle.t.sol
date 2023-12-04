// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import {Test} from "forge-std/Test.sol";

interface IERC20 {
    function balanceOf(address) external returns (uint256);

    function approve(address, uint256) external returns (bool);

    function transfer(address, uint) external returns (uint256);
}

interface ICurvePool is IERC20 {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external payable returns (uint256);

    function get_p() external returns (uint256);

    function price_oracle() external returns (uint256);

    function ma_last_time() external returns (uint256);
}

interface IWETH9 is IERC20 {
    function deposit() external payable;

    function withdraw(uint256 wad) external;
}

interface MasterOracle {
    function getPriceInUsd(address token_) external view returns (uint256 _priceInUsd);
}

contract SFrxEthOracleTest is Test {
    IWETH9 public constant WETH = IWETH9(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2);
    MasterOracle public constant MASTER_ORACLE = MasterOracle(0x80704Acdf97723963263c78F861F091ad04F46E2);
    ICurvePool public constant FRXETH_WETH_CRV_POOL = ICurvePool(0x9c3B46C0Ceb5B9e304FCd6D88Fc50f7DD24B31Bc);
    IERC20 public constant SFRXETH = IERC20(0xac3E018457B222d93114458476f3E3416Abbe38F);

    function setUp() public {
        vm.createSelectFork(vm.envString("FORK_NODE_URL"), 18_712_800);
    }

    function test_manipulation() external payable {
        // given
        uint amountIn = 10_000 * 1e18;
        vm.deal(address(this), amountIn);
        uint priceBefore = MASTER_ORACLE.getPriceInUsd(address(SFRXETH));
        assertApproxEqAbs(priceBefore, 2_373 * 1e18, 1e18);

        // when
        WETH.deposit{value: amountIn}();
        WETH.approve(address(FRXETH_WETH_CRV_POOL), amountIn);
        FRXETH_WETH_CRV_POOL.exchange(0, 1, amountIn, 0);

        // then
        assertEq(
            MASTER_ORACLE.getPriceInUsd(address(SFRXETH)),
            priceBefore,
            "Should not change price at the same block"
        );

        vm.warp(block.timestamp + 12 seconds);

        assertApproxEqRel(
            MASTER_ORACLE.getPriceInUsd(address(SFRXETH)),
            priceBefore,
            0.00001e18, // 0.001% var
            "Should not change price significantly from the the next block"
        );
    }

    receive() external payable {}
}
