#!/bin/bash

network=$1;

if [[ "$network" == "" ]];
then
    echo "Use: $0 <network>"
    exit
fi

if [[ "$network" != "mainnet" && "$network" != "optimism" && "$network" != "base" && "$network" != "swell" && "$network" != "hemi" ]];
then
    echo "'$network' is invalid"
    exit
fi

# Prepare deployment data
cp -r deployments/$network deployments/localhost

# Impersonate deployer
npx hardhat impersonate-deployer --network localhost

# Deployment

#mainnet
#npx hardhat deploy --network localhost --tags ERC4626TokenOracle,setupOracles,MultiSigTxs

#base
#npx hardhat deploy --network localhost --tags setupOracles,MultiSigTxs

#op
npx hardhat deploy --network localhost --tags setupOracles,MultiSigTxs,ChainlinkEthOnlyTokenOracle

