#!/bin/bash
#
# Notes:
# - If you want to impersonate deployer, set it to the `DEPLOYER` env var
# - If you want to check `deployments/` files changes easier, uncomment `deployments/localhost` line from `.gitignore` and stage them.
#   All modifications done by the scripts will appear on the git changes area.
#

# Update ENV VARS
source .env

echo "Make sure .env has the correct values."
echo ""
echo FORK_NODE_URL=$FORK_NODE_URL
echo FORK_BLOCK_NUMBER=$FORK_BLOCK_NUMBER
echo ""
echo -n "Press <ENTER> to continue: "
read

# Clean old files
rm  -rf artifacts/ cache/ multisig.batch.tmp.json

# Run node
npx hardhat node --fork $FORK_NODE_URL --fork-block-number $FORK_BLOCK_NUMBER --no-deploy

# Impersonate deployer
# npx hardhat impersonate-deployer --network localhost

