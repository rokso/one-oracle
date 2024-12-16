#!/bin/bash
#
# This script runs all chains' tests sequencialy
# It's a tool for local development, for CI we use workflows since they run in parallel
#

THIS=`dirname $0`

for chain in mainnet avalanche polygon optimism swell;
do
    cp $THIS/../.github/$chain.env.properties $THIS/../.env
    npx hardhat test --grep @$chain
done
