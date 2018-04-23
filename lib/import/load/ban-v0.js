const {through, pipeline} = require('mississippi')
const {deburr} = require('lodash')
const parse = require('csv-parser')
const getStream = require('get-stream')
const decompress = require('decompress')
const {bufferToStream} = require('../utils')

function prepareData(addr, enc, next) {
  if (!addr.numero || !addr.nom_voie) {
    return next()
  }
  const nomVoie = addr.nom_voie || addr.nom_ld
  const codeCommune = addr.code_insee
  const codeVoie = addr.id_fantoir || deburr(nomVoie).toLowerCase().replace(/\W/g, '-')
  const numero = addr.numero + addr.rep.toUpperCase()
  const idVoie = `${codeCommune}-${codeVoie}`
  const id = `${idVoie}-${numero}`

  const adresse = {
    source: 'ban',
    id,
    originalId: addr.id,
    numero,
    nomVoie,
    codeVoie,
    idVoie,
    codeCommune,
    nomCommune: addr.nom_commune,
    codePostal: addr.code_post || undefined
  }
  if (addr.lat && addr.lon) {
    adresse.position = {
      type: 'Point',
      coordinates: [parseFloat(addr.lon), parseFloat(addr.lat)]
    }
  }
  next(null, adresse)
}

async function load(path) {
  const files = await decompress(path)
  const csvFile = files.find(f => f.path.endsWith('csv'))
  const adresses = await getStream.array(pipeline.obj(
    bufferToStream(csvFile.data),
    parse({separator: ';'}),
    through.obj(prepareData)
  ))
  console.log(adresses.length)
  console.log(adresses[0])
  return adresses
}

module.exports = load
