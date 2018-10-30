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
    nomVoie: addr.nomVoie,
    codeVoie: addr.id.substr(6, 4),
    idVoie: addr.id.substr(0, 10),
    codeCommune: addr.codeCommune,
    nomCommune: addr.nomCommune,
    codePostal: addr.codePostal,
    libelleAcheminement: addr.libelleAcheminement,
    extras: {
      pseudoNumero: addr.pseudoNumero,
      adresseUtile: addr.adresseUtile,
      positionType: addr.meilleurePosition ? addr.meilleurePosition.type : 'aucune',
      destination: [addr.destinationPrincipale],
      parcelles: addr.codesParcelles
    },
    position: addr.meilleurePosition ? addr.meilleurePosition.geometry : undefined
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
