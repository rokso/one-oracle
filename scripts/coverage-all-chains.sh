#!/bin/bash
#
# This script runs all chains' tests sequencialy
# It's a tool for local development, for CI we use workflows since they run in parallel
#

THIS=`dirname $0`
SOLCOVER="$THIS/../.solcover.js"

for chain in mainnet avalanche polygon arbitrum;
do
    rm $THIS/../coverage.json
    cp $THIS/../.github/$chain.env.properties $THIS/../.env
    echo "module.exports = { mocha: { grep: \"$chain\" }, istanbulFolder: \"./coverage/$chain\" }" > $SOLCOVER
    npx hardhat coverage
done

rm $SOLCOVER
