const {promisify} = require('util')
const workerFarm = require('worker-farm')

async function prepareData({banSourcePattern, banoSourcePattern, cadastreSourcePattern, departements, addokFilePattern}) {
  const workerFarmOptions = {
    maxCallsPerWorker: 1,
    maxConcurrentCallsPerWorker: 1,
    maxRetries: 0
  }
  const farm = workerFarm(workerFarmOptions, require.resolve('./worker'))
  const runWorker = promisify(farm)

  await Promise.all(departements.map(async departement => {
    const banPath = banSourcePattern.replace('{dep}', departement)
    const banoPath = banoSourcePattern.replace('{dep}', departement)
    const cadastrePath = cadastreSourcePattern.replace('{dep}', departement)
    const addokFilePath = addokFilePattern.replace('{dep}', departement)
    await runWorker({banPath, banoPath, cadastrePath, addokFilePath, departement})
  }))

  workerFarm.end(farm)
}

module.exports = prepareData
