const {promisify} = require('util')
const workerFarm = require('worker-farm')

async function prepareData({banSourcePattern, banoSourcePattern, cadastreSourcePattern, ftthSourcePattern, balSourcePattern, departements, addokFilePattern}) {
  const workerFarmOptions = {
    maxConcurrentWorkers: 4,
    maxCallsPerWorker: 1,
    maxConcurrentCallsPerWorker: 1,
    maxRetries: 0,
    workerOptions: {
      execArgv: ['--max-old-space-size=8192']
    }
  }
  const farm = workerFarm(workerFarmOptions, require.resolve('./worker'))
  const runWorker = promisify(farm)

  await Promise.all(departements.map(async departement => {
    const banPath = banSourcePattern.replace('{dep}', departement)
    const banoPath = banoSourcePattern.replace('{dep}', departement)
    const cadastrePath = cadastreSourcePattern.replace('{dep}', departement)
    const ftthPath = ftthSourcePattern.replace('{dep}', departement)
    const balPath = balSourcePattern.replace('{dep}', departement)
    const addokFilePath = addokFilePattern.replace('{dep}', departement)
    await runWorker({banPath, banoPath, cadastrePath, ftthPath, balPath, addokFilePath, departement})
  }))

  workerFarm.end(farm)
}

module.exports = prepareData
