import {BigNumber} from '@ethersproject/bignumber'
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {ethers, network} from 'hardhat'

export const MINUTE = BigNumber.from(60)
export const HOUR = MINUTE.mul(60)
export const DAY = HOUR.mul(24)
export const WEEK = DAY.mul(7)
export const MONTH = DAY.mul(30)
export const YEAR = DAY.mul(365)

export const parseUnits = (n: string, d: number) => ethers.utils.parseUnits(n.replace(new RegExp(/,/g), ''), d)

export const parseEther = (n: string) => parseUnits(n, 18)

export const toUSD = (n: string) => parseUnits(n, 18)

export const increaseTime = async (timeToIncrease: BigNumber): Promise<void> => {
  await ethers.provider.send('evm_increaseTime', [timeToIncrease.toNumber()])
  await ethers.provider.send('evm_mine', [])
}

export const setEtherBalance = async (address: string, value: BigNumber): Promise<void> => {
  await network.provider.request({
    method: 'hardhat_setBalance',
    params: [address, ethers.utils.hexStripZeros(value.toHexString())],
  })
}

export const impersonateAccount = async (address: string): Promise<SignerWithAddress> => {
  await network.provider.request({method: 'hardhat_impersonateAccount', params: [address]})
  await setEtherBalance(address, parseEther('1,000,000'))
  return await ethers.getSigner(address)
}

export const timestampFromLatestBlock = async (): Promise<number> =>
  (await ethers.provider.getBlock('latest')).timestamp

export const min = (a: BigNumber, b: BigNumber) => (a.lt(b) ? a : b)

export const max = (a: BigNumber, b: BigNumber) => (a.gte(b) ? a : b)
