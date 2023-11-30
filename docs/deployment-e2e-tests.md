## Setup (.env)

- Set `FORK_NODE_URL`, `FORK_BLOCK_NUMBER`
- If you only want to test changes bypassing multi-sig logic, leave `DEPLOYER` empty otherwise use real address (i.e. deployer/delegate)

```sh
source .env
```

## fork mainnet

```sh
rm -rf artifacts/ cache/

npx hardhat node --fork $FORK_NODE_URL --fork-block-number $FORK_BLOCK_NUMBER --no-deploy
```

If you have set `process.env.DEPLOYER` account, run:

```sh
npx hardhat impersonate-deployer --network localhost
```

## run deployment

```sh
cp -r deployments/<NETWORK>/ deployments/localhost
```

Note: If you want to check `deployments/` files changes easier, uncomment `deployments/localhost` line from `.gitignore` and stage them.
All modifications done by the scripts will appear on the git changes are.

```sh
npx hardhat deploy --network localhost > DEPLOYMENT_OUTPUT.txt
```
