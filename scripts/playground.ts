import {ethers} from 'hardhat'
import {address as SFRAXETH_ORACLE_ADDRESS} from '../deployments/localhost/SFraxEthTokenOracle.json'
import {address as MASTER_ORACLE_ADDRESS} from '../deployments/localhost/MasterOracle.json'

const SFRAXETH_ADDRESS = '0xac3E018457B222d93114458476f3E3416Abbe38F'

// Run: npx hardhat run scripts/playground.ts --network localhost
const main = async () => {
  const sFraxEthOracle = await ethers.getContractAt('SFraxEthTokenOracle', SFRAXETH_ORACLE_ADDRESS)
  const masterOracle = await ethers.getContractAt('MasterOracle', MASTER_ORACLE_ADDRESS)

  const isUpdate = (await masterOracle.oracles(SFRAXETH_ADDRESS)) == sFraxEthOracle.address
  console.log(`isUpdate: ${isUpdate}`)
  console.log(`price: ${ethers.utils.formatEther(await masterOracle.getPriceInUsd(SFRAXETH_ADDRESS))})`)
}

main().catch(console.log)
