/* eslint camelcase: off */
const {createReadStream} = require('fs')
const {createGunzip} = require('gunzip-stream')
const {through, pipeline} = require('mississippi')
const getStream = require('get-stream')
const {parse} = require('JSONStream')

function prepareData(addr, enc, next) {
  const {properties, geometry} = addr
  const adresse = {
    source: 'cadastre',
    id: properties.id,
    originalId: properties.id,
    numero: properties.numero.toUpperCase(),
    nomVoie: properties.libelle_voie,
    codeVoie: properties.id.substr(6, 4),
    idVoie: properties.id.substr(0, 10),
    codeCommune: properties.code_commune,
    nomCommune: properties.nom_commune,
    codePostal: properties.code_postal,
    libelleAcheminement: properties.libelle_acheminement,
    extras: {
      position_type: properties.position_type,
      destination: properties.destination,
      parcelles: properties.parcelles
    },
    position: geometry
  }
  next(null, adresse)
}

function load(path) {
  return getStream.array(pipeline.obj(
    createReadStream(path),
    createGunzip(),
    parse('features.*'),
    through.obj(prepareData)
  ))
}

module.exports = load
