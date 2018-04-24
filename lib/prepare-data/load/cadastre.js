const {createReadStream} = require('fs')
const {createGunzip} = require('gunzip-stream')
const {through, pipeline} = require('mississippi')
const getStream = require('get-stream')
const {parse} = require('ndjson')

function prepareData(addr, enc, next) {
  if (addr.numeroComplet.startsWith('X')) {
    return next()
  }
  const adresse = {
    source: 'cadastre',
    id: addr.id.toUpperCase(),
    originalId: addr.id,
    numero: addr.numeroComplet.toUpperCase(),
    nomVoie: addr.libelleVoie,
    codeVoie: addr.id.substr(6, 4),
    idVoie: addr.id.substr(0, 10),
    codeCommune: addr.codeCommune,
    nomCommune: addr.nomCommune,
    codePostal: addr.codePostal,
    libelleAcheminement: addr.libelleAcheminement,
    extras: {
      pseudoNumero: addr.pseudoNumero,
      positionType: addr.positionType,
      destination: addr.categoriesUtiles,
      parcelles: addr.codesParcelles
    },
    position: addr.position
  }
  next(null, adresse)
}

function load(path) {
  return getStream.array(pipeline.obj(
    createReadStream(path),
    createGunzip(),
    parse(),
    through.obj(prepareData)
  ))
}

module.exports = load
