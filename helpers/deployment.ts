import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {expect} from 'chai'
import Address from './address'

const AddressProvider = 'AddressProvider'

const deployAddressProvider = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deterministic} = deployments
  const {deployer} = await getNamedAccounts()

  if (deployer !== Address.DEPLOYER) {
    console.log(`The AddressProvider must be deployed by '${Address.DEPLOYER}'`)
    console.log('Skipping AddressProvider deployment...')
  }

  // Both 'OpenZeppelinTransparentProxy' and 'AddressProvider' codes must always be the same when deploying
  // in order to result in the same address across all chains.
  // For instance, if we have a new version of the `AddressProvider`, we must deploy the 1st version then upgrade it.
  //
  // If it became a recurrent issue, we can improve this script by using any contract that exists in many chains
  // as the implementation during deployment and them upgrade it to the latest version of `AddressProvider`,
  // an example of contract that we may use is the create2 factory ('0x914d7Fec6aaC8cd542e72Bca78B30650d45643d7')
  const {deploy} = await deterministic(AddressProvider, {
    contract: AddressProvider,
    from: deployer,
    log: true,
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        init: {
          methodName: 'initialize',
          args: [deployer],
        },
      },
    },
  })

  const {address} = await deploy()
  expect(address).eq(Address.ADDRESS_PROVIDER)
}

deployAddressProvider.tags = [AddressProvider]

export {deployAddressProvider}
