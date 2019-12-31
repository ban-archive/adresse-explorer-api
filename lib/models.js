const {bboxPolygon} = require('@turf/turf')
const {sortBy} = require('lodash')
const mongo = require('./utils/mongo')
const {getDepartementByCommune} = require('./cog')

function sortNumeros(numeros) {
  return sortBy(numeros, n => {
    const [, numero, suffixe] = String(n.numero).match(/^(\d+)([a-z][a-z0-9]*)?/i)
    return numero.padStart(4, '0') + (suffixe || '')
  })
}

function getVoies(codeCommune) {
  return mongo.db.collection('voies').find({codeCommune}).project({adressesOriginales: 0, _id: 0}).toArray()
}

async function getNumerosByVoie(idVoie) {
  const numeros = await mongo.db.collection('numeros')
    .find({idVoie})
    .project({adressesOriginales: 0, codePostal: 0, libelleAcheminement: 0, _id: 0})
    .toArray()
  return sortNumeros(numeros)
}

function getNumerosByBoundingBox(codeCommune, bbox) {
  return mongo.db.collection('numeros')
    .find({
      codeCommune,
      position: {
        $geoWithin: {
          $geometry: bboxPolygon(bbox).geometry
        }
      }
    })
    .project({entries: 0, centrePositions: 0, codePostal: 0, libelleAcheminement: 0, _id: 0})
    .limit(5000)
    .toArray()
}

async function getVoie(idVoie) {
  const voie = await mongo.db.collection('voies').findOne({idVoie})
  const numeros = await getNumerosByVoie(idVoie)
  const departement = getDepartementByCommune(voie.codeCommune)

  if (departement) {
    voie.codeDepartement = departement.code
    voie.nomDepartement = departement.nom
  }

  voie.numeros = numeros
  return voie
}

function getNumero(cleInterop) {
  return mongo.db.collection('numeros').findOne({cleInterop})
}

module.exports = {
  getVoies,
  getNumerosByVoie,
  getVoie,
  getNumero,
  getNumerosByBoundingBox
}
