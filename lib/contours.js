const got = require('got')

async function getCommunesFeatures() {
  const response = await got('http://etalab-datasets.geo.data.gouv.fr/contours-administratifs/latest/geojson/communes-100m.geojson', {responseType: 'json'})
  return response.body.features
}

async function getDepartementsFeatures() {
  const response = await got('http://etalab-datasets.geo.data.gouv.fr/contours-administratifs/latest/geojson/departements-100m.geojson', {responseType: 'json'})
  return response.body.features
}

async function buildContoursIndex() {
  const communesFeatures = await getCommunesFeatures()
  const departementsFeatures = await getDepartementsFeatures()
  return ([...communesFeatures, ...departementsFeatures]).reduce((acc, feature) => {
    acc[feature.properties.code] = feature.geometry
    return acc
  }, {})
}

module.exports = {buildContoursIndex}
