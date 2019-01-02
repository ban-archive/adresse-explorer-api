const {createReadStream} = require('fs')
const {createGunzip} = require('gunzip-stream')
const {through, pipeline} = require('mississippi')
const {parse} = require('geojson-stream')
const getStream = require('get-stream')

function prepareData(feature, enc, next) {
  const props = feature.properties
  const numero = (props.numero + (props.suffixe || '')).toUpperCase()
  const idVoie = `${props.codeCommune}-${props.codeVoie}`
  const id = `${idVoie}-${numero}`
  const adresse = {
    source: 'ftth',
    id,
    originalId: props.id,
    numero,
    nomVoie: props.nomVoie,
    idVoie,
    codeVoie: props.codeVoie,
    codeCommune: props.codeCommune,
    nomCommune: props.nomCommune,
    codePostal: props.codePostal || undefined,
    extras: {
      batiment: props.batiment,
      pseudoCodeVoie: props.pseudoCodeVoie
    },
    position: feature.geometry
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
