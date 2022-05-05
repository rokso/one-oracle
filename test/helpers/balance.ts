import Address from '../../helpers/address'
import {ethers} from 'hardhat'
import {BigNumber} from 'ethers'
const {hexlify, solidityKeccak256, zeroPad, getAddress, hexStripZeros} = ethers.utils

// Slot number mapping for a token. Prepared using utility https://github.com/kendricktan/slot20
const slots = {
  [Address.mainnet.DAI_ADDRESS]: 2,
  [Address.mainnet.WETH_ADDRESS]: 3,
  [Address.mainnet.USDC_ADDRESS]: 9,
  [Address.mainnet.WBTC_ADDRESS]: 0,
  [Address.avalanche.WAVAX_ADDRESS]: 3,
  [Address.avalanche.DAI_ADDRESS]: 0,
  [Address.avalanche.WETH_ADDRESS]: 0,
  [Address.avalanche.USDC_ADDRESS]: 0,
  [Address.avalanche.WBTC_ADDRESS]: 0,
}

const getSlot = (
  token: string // only use checksum address
) => slots[getAddress(token)]

export const adjustBalance = async (token: string, targetAddress: string, balance: BigNumber) => {
  const slot = getSlot(token)
  if (slot === undefined) {
    throw new Error(`Missing slot configuration for token ${token}`)
  }

  // reason: https://github.com/nomiclabs/hardhat/issues/1585 comments
  // Create solidity has for index, convert it into hex string and remove all the leading zeros
  const index = hexStripZeros(hexlify(solidityKeccak256(['uint256', 'uint256'], [targetAddress, slot])))

  const value = hexlify(zeroPad(balance.toHexString(), 32))

  // Hack the balance by directly setting the EVM storage
  await ethers.provider.send('hardhat_setStorageAt', [token, index, value])
  await ethers.provider.send('evm_mine', [])
}
