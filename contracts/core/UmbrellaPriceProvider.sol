// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@umb-network/toolbox/dist/contracts/IChain.sol";
import "@umb-network/toolbox/dist/contracts/IRegistry.sol";
import "../access/Governable.sol";
import "../interfaces/core/IUmbrellaPriceProvider.sol";

/**
 * @notice Umbrella's price provider
 */
contract UmbrellaPriceProvider is IUmbrellaPriceProvider, Governable {
    bytes32 private constant CHAIN = bytes32("Chain");

    /**
     * @notice Umbrella's Registry
     * @dev Has other contracts' addresses
     */

    IRegistry public immutable registry;

    constructor(IRegistry registry_) {
        require(address(registry_) != address(0), "registry-is-null");
        registry = registry_;
    }

    /// @inheritdoc IPriceProvider
    function getPriceInUsd(address token_) public view override returns (uint256 _priceInUsd, uint256 _lastUpdatedAt) {
        return _getUsdPriceOfAsset(token_);
    }

    /// @inheritdoc IPriceProvider
    function quote(
        address tokenIn_,
        address tokenOut_,
        uint256 amountIn_
    ) external view override returns (uint256 _amountOut, uint256 _lastUpdatedAt) {
        (uint256 _amountInUsd, uint256 _lastUpdatedAt0) = quoteTokenToUsd(tokenIn_, amountIn_);
        (_amountOut, _lastUpdatedAt) = quoteUsdToToken(tokenOut_, _amountInUsd);
        _lastUpdatedAt = Math.min(_lastUpdatedAt0, _lastUpdatedAt);
    }

    /// @inheritdoc IUSDPriceProvider
    function quoteTokenToUsd(address token_, uint256 amountIn_)
        public
        view
        override
        returns (uint256 _amountOut, uint256 _lastUpdatedAt)
    {
        uint256 _price;
        (_price, _lastUpdatedAt) = _getUsdPriceOfAsset(token_);
        _amountOut = (amountIn_ * _price) / 10**IERC20Metadata(token_).decimals();
    }

    /// @inheritdoc IUSDPriceProvider
    function quoteUsdToToken(address token_, uint256 amountIn_)
        public
        view
        override
        returns (uint256 _amountOut, uint256 _lastUpdatedAt)
    {
        uint256 _price;
        (_price, _lastUpdatedAt) = _getUsdPriceOfAsset(token_);
        _amountOut = (amountIn_ * 10**IERC20Metadata(token_).decimals()) / _price;
    }

    /**
     * @notice Get Umbrella's main contract
     */
    function _chain() internal view returns (IChain umbChain) {
        umbChain = IChain(registry.getAddress(CHAIN));
    }

    /**
     * @notice Get token's price
     * @param token_ The token
     * @return _priceInUsd The USD price
     * @return _lastUpdatedAt Last updated timestamp
     */
    function _getUsdPriceOfAsset(address token_)
        internal
        view
        virtual
        returns (uint256 _priceInUsd, uint256 _lastUpdatedAt)
    {
        bytes32 _key = _toKey(token_);

        (_priceInUsd, _lastUpdatedAt) = _chain().getCurrentValue(_key);
        require(_lastUpdatedAt > 0, "invalid-quote");
    }

    /**
     * @notice Build key from quote/base string in bytes format
     * @dev The standard parser `bytes32(bytes)` will right pad with zeros
     * but Umbrella expects left padded bytes as key
     * @dev See if there is a simpler way to do the same as this function
     */
    function _toKey(address token_) internal view returns (bytes32) {
        require(token_ != address(0), "invalid-token");
        // Note: Assuming that the symbol is a upper case string
        // If need to handle tokens where it isn't true, we can use a function like this
        // https://gist.github.com/kepler-296e/f9196a8d4cb94e833302c464479e5b65
        string memory _base = IERC20Metadata(token_).symbol();
        bytes32 _baseHash = keccak256(abi.encodePacked(_base));
        if (_baseHash == keccak256("WBTC")) _base = "BTC";
        else if (_baseHash == keccak256("WETH")) _base = "ETH";

        bytes memory bytes_ = abi.encodePacked(_base, "-USD");

        bytes memory _aux = new bytes(32);
        uint256 _len = bytes_.length;
        for (uint256 i; i < _len; ++i) {
            uint256 _idx = 32 - _len + i;
            _aux[_idx] = bytes_[i];
        }
        return bytes32(_aux);
    }
}
