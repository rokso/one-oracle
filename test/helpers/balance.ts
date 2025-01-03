import {Addresses} from '../../helpers/address'
import {ethers} from 'hardhat'
import {BigNumber} from 'ethers'
const {hexlify, solidityKeccak256, zeroPad, getAddress, hexStripZeros} = ethers.utils

// Slot number mapping for a token. Prepared using utility https://github.com/kendricktan/slot20
const slots = {
  [Addresses.mainnet.DAI]: 2,
  [Addresses.mainnet.WETH]: 3,
  [Addresses.mainnet.USDC]: 9,
  [Addresses.mainnet.WBTC]: 0,
  [Addresses.mainnet.MUSD]: 51,
  [Addresses.mainnet.Chainlink.NOT_ON_CHAINLINK_TOKEN]: 0,
  [Addresses.mainnet.STG]: 0,
  [Addresses.mainnet.FRAX]: 0,
  [Addresses.mainnet.Frax.frxETH]: 0,
  [Addresses.mainnet.CVX]: 0,
  [Addresses.optimism.WETH]: 3,
}

// Some tokens, specially rebase tokens, uses dynamic storage or multi storage hence
// there is no clear balanceOf storage so using whale address for adjusting balance
const whales = {
  [Addresses.mainnet.STETH]: '0x1982b2F5814301d4e9a8b0201555376e62F82428',
  [Addresses.mainnet.CRV]: '0x5f3b5DfEb7B28CDbD7FAba78963EE202a494e2A2', // slot id is 3 but not working so using whale
  [Addresses.mainnet.CBETH]: '0xED1F7bb04D2BA2b6EbE087026F03C96Ea2c357A8',
  [Addresses.mainnet.EUL]: '0x7597851F3fD386a13b5784677AE8a569bdB33A95',
}

/**
 * Get Whale address for given token
 * @param {string} token token address
 * @returns {string} Whale address
 */
const getWhale = (token: string) => whales[getAddress(token)]

/**
 * Get slot number for a token
 *
 * @param {string} token  token address
 * @returns {number} slot number for provided token address
 */
const getSlot = (token: string) => slots[getAddress(token)]

async function getBalanceFromWhale(token: string, targetAddress: string, balance: BigNumber) {
  const whale = getWhale(token)
  if (whale === undefined) {
    throw new Error(`Missing slot and whale, both, configuration for token ${token}. At least one is required`)
  }
  const tokenObj = await ethers.getContractAt('ERC20', token)
  const whaleBalance = await tokenObj.balanceOf(whale)
  if (whaleBalance.lt(balance)) {
    throw new Error('Whale has less token balance than requested')
  }
  await ethers.provider.send('hardhat_impersonateAccount', [whale])
  await ethers.provider.send('hardhat_setBalance', [
    whale,
    ethers.utils.hexStripZeros(ethers.utils.parseEther('10').toHexString()),
  ])
  const whaleSigner = await ethers.getSigner(whale)
  await tokenObj.connect(whaleSigner).transfer(targetAddress, balance)
  return tokenObj.balanceOf(targetAddress)
}

// eslint-disable-next-line consistent-return
export const adjustBalance = async (token: string, targetAddress: string, balance: BigNumber) => {
  const slot = getSlot(token)
  if (slot === undefined) {
    return getBalanceFromWhale(token, targetAddress, balance)
  }

  // reason: https://github.com/nomiclabs/hardhat/issues/1585 comments
  // Create solidity has for index, convert it into hex string and remove all the leading zeros
  const index = hexStripZeros(hexlify(solidityKeccak256(['uint256', 'uint256'], [targetAddress, slot])))

  const value = hexlify(zeroPad(balance.toHexString(), 32))

  // Hack the balance by directly setting the EVM storage
  await ethers.provider.send('hardhat_setStorageAt', [token, index, value])
  await ethers.provider.send('evm_mine', [])
}
