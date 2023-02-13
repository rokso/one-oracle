const fs = require('fs')
const _ = require('lodash')

const readFileAsJson = (fileName) => JSON.parse(fs.readFileSync(fileName).toString())

const getAddress = (fileName) => readFileAsJson(fileName).address

// Return pool deployment name and address
function getDeploymentData(network) {
  const networkDir = `./deployments/${network}`
  const data = fs.readdirSync(networkDir).map(function (fileName) {
    if (fileName.includes('.json')) {
      return {
        [fileName.split('.json')[0]]: getAddress(`${networkDir}/${fileName}`),
      }
    }
    return {}
  })
  return _.merge(...data)
}

/* eslint-disable no-param-reassign */
task('create-release', 'Create release file from deploy data').setAction(async function () {
  const releaseDir = 'releases/'
  const releaseFile = `${releaseDir}/contracts.json`

  let releaseData = {}

  if (!fs.existsSync(releaseDir)) {
    fs.mkdirSync(releaseDir, {recursive: true})
  }

  ['avalanche', 'bsc', 'mainnet', 'polygon', 'optimism'].forEach((network) => {
    // Read deployment name and address
    const deployData = getDeploymentData(network)

    // Update latest deployment
    releaseData[network] = deployData
  })
  // Write release data into file
  fs.writeFileSync(releaseFile, JSON.stringify(releaseData, null, 2))
})

module.exports = {}
