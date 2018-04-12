const {createReadStream} = require('fs')
const {createGunzip} = require('gunzip-stream')
const {through, pipeline} = require('mississippi')
const parse = require('csv-parser')
const getStream = require('get-stream')

function prepareData(addr, enc, next) {
  const numero = addr.numero.toUpperCase()
  const codeCommune = addr.id.substr(0, 5)
  const codeVoie = addr.id.substr(5, 4)
  const idVoie = `${codeCommune}-${codeVoie}`
  const id = `${idVoie}-${numero}`
  const adresse = {
    source: 'bano',
    id,
    originalId: addr.id,
    numero,
    nomVoie: addr.voie,
    idVoie,
    codeVoie,
    codeCommune,
    nomCommune: addr.nom_comm,
    codePostal: addr.code_post || undefined,
    extras: {
      source: addr.source
    },
    position: {
      type: 'Point',
      coordinates: [parseFloat(addr.lon), parseFloat(addr.lat)]
    }
  }
  next(null, adresse)
}

const COLUMNS = [
  'id',
  'numero',
  'voie',
  'code_post',
  'nom_comm',
  'source',
  'lat',
  'lon'
]

function load(path) {
  return getStream.array(pipeline.obj(
    createReadStream(path),
    createGunzip(),
    parse({separator: ',', headers: COLUMNS}),
    through.obj(prepareData)
  ))
}

module.exports = load
