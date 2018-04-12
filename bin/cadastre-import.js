#!/usr/bin/env node
/* eslint camelcase: off */
const {createGunzip} = require('gunzip-stream')
const {through, pipeline} = require('mississippi')
const getStream = require('get-stream')
const {parse} = require('JSONStream')
const mongo = require('../lib/utils/mongo')

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

async function main() {
  await mongo.connect()

  const stream = pipeline.obj(
    process.stdin,
    createGunzip(),
    parse('features.*'),
    through.obj(prepareData)
  )

  const adresses = await getStream.array(stream)
  await mongo.db.collection('adresses').insertMany(adresses)
  await mongo.disconnect()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
