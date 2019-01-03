const {createReadStream} = require('fs')
const {pathExists} = require('fs-extra')
const {createGunzip} = require('gunzip-stream')
const {through, pipeline} = require('mississippi')
const parse = require('csv-parser')
const getStream = require('get-stream')

function prepareData(item, enc, next) {
  const numero = `${item.numero}${item.suffixe || ''}`.toUpperCase()
  const idVoie = `${item.codeCommune}-${item.codeVoie}`
  const id = `${idVoie}-${numero}`
  const adresse = {
    source: 'bal',
    id,
    originalId: item.id,
    numero,
    nomVoie: item.nomVoie,
    idVoie,
    codeVoie: item.codeVoie,
    codeCommune: item.codeCommune,
    nomCommune: item.nomCommune,
    extras: {}
  }
  if (item.lon && item.lat) {
    adresse.position = {
      type: 'Point',
      coordinates: [parseFloat(item.lon), parseFloat(item.lat)]
    }
  }
  next(null, adresse)
}

async function load(path) {
  if (!(await pathExists(path))) {
    return []
  }
  return getStream.array(pipeline.obj(
    createReadStream(path),
    createGunzip(),
    parse({separator: ';'}),
    through.obj(prepareData)
  ))
}

module.exports = load
