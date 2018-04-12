const {createReadStream} = require('fs')
const {createGunzip} = require('gunzip-stream')
const {through, pipeline} = require('mississippi')
const {deburr} = require('lodash')
const parse = require('csv-parser')
const getStream = require('get-stream')

function prepareData(addr, enc, next) {
  if (!addr.number || !addr.nom_voie) {
    return next()
  }
  const codeCommune = addr.code_insee
  const codeVoie = addr.id_fantoir ? addr.id_fantoir.substr(5, 4) : deburr(addr.nom_voie).toLowerCase().replace(/\W/g, '-')
  const numero = addr.number + addr.rep.toUpperCase()
  const idVoie = `${codeCommune}-${codeVoie}`
  const id = `${idVoie}-${numero}`

  const adresse = {
    source: 'ban',
    id,
    originalId: addr.id,
    numero,
    nomVoie: addr.nom_voie,
    codeVoie,
    idVoie,
    codeCommune,
    nomCommune: addr.nom_commune,
    codePostal: addr.code_post || undefined,
    libelleAcheminement: addr.libelle_acheminement || undefined
  }
  if (addr.lat && addr.lon) {
    adresse.position = {
      type: 'Point',
      coordinates: [parseFloat(addr.lon), parseFloat(addr.lat)]
    }
  }
  next(null, adresse)
}

function load(path) {
  return getStream.array(pipeline.obj(
    createReadStream(path),
    createGunzip(),
    parse({separator: ','}),
    through.obj(prepareData)
  ))
}

module.exports = load
