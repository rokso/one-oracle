#!/bin/bash

network=$1;

if [[ "$network" == "" ]];
then
    echo "Use: $0 <network>"
    exit
fi

if [[ "$network" != "mainnet" && "$network" != "optimism" ]];
then
    echo "'$network' is invalid"
    exit
fi

# Prepare deployment data
cp -r deployments/$network deployments/localhost

# Deployment
npx hardhat deploy --network localhost --tags TBYOracle,setupOracles,MultiSigTxs #> DEPLOYMENT_TEST_OUTPUT.log

