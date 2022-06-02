// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@umb-network/toolbox/dist/contracts/IChain.sol";
import "@umb-network/toolbox/dist/contracts/IRegistry.sol";
import "../access/Governable.sol";
import "../interfaces/core/IUmbrellaPriceProvider.sol";
import "./PriceProvider.sol";

/**
 * @notice Umbrella's price provider
 */
contract UmbrellaPriceProvider is IUmbrellaPriceProvider, PriceProvider, Governable {
    bytes32 private constant CHAIN = bytes32("Chain");

    /**
     * @notice token => Umbrella's key mapping (e.g. WBTC => "BTC-USD")
     */
    mapping(address => bytes32) public keyOfToken;

    /**
     * @notice Umbrella's Registry
     * @dev Stores the other Umbrella's contracts' addresses
     */
    IRegistry public immutable registry;

    event KeyOfTokenUpdated(address indexed token, bytes32 oldKey, bytes32 newKey);

    constructor(IRegistry registry_) {
        require(address(registry_) != address(0), "registry-is-null");
        registry = registry_;
    }

    /// @inheritdoc IPriceProvider
    function getPriceInUsd(address token_)
        public
        view
        virtual
        override(IPriceProvider, PriceProvider)
        returns (uint256 _priceInUsd, uint256 _lastUpdatedAt)
    {
        (_priceInUsd, _lastUpdatedAt) = _chain().getCurrentValue(keyOfToken[token_]);
        require(_lastUpdatedAt > 0, "invalid-quote");
    }

    /**
     * @notice Get Umbrella's main contract
     */
    function _chain() internal view returns (IChain umbChain) {
        umbChain = IChain(registry.getAddress(CHAIN));
    }

    /**
     * @notice Build key from quote/base string in bytes format
     * @dev The standard parser `bytes32(bytes)` will right pad with zeros
     * but Umbrella expects left padded bytes as key
     * @dev See if there is a simpler way to do the same as this function
     */
    function _toKey(bytes memory quotePairAsBytes_) private pure returns (bytes32) {
        bytes memory _aux = new bytes(32);
        uint256 _len = quotePairAsBytes_.length;
        for (uint256 i; i < _len; ++i) {
            uint256 _idx = 32 - _len + i;
            _aux[_idx] = quotePairAsBytes_[i];
        }
        return bytes32(_aux);
    }

    /**
     * @notice Update Umbrella's key of a token
     * Use `BASE-QUOTE` format (e.g. BTC-USD, ETH-USD, etc)
     */
    function updateKeyOfToken(address token_, string memory quotePair_) external onlyGovernor {
        require(token_ != address(0), "address-is-null");
        bytes32 _currentKey = keyOfToken[token_];
        bytes32 _newKey = _toKey(bytes(quotePair_));
        keyOfToken[token_] = _newKey;
        emit KeyOfTokenUpdated(token_, _currentKey, _newKey);
    }
}
