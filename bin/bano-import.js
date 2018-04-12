#!/usr/bin/env node
const {createGunzip} = require('gunzip-stream')
const {through, pipeline} = require('mississippi')
const parse = require('csv-parser')
const getStream = require('get-stream')
const mongo = require('../lib/utils/mongo')

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

async function main() {
  await mongo.connect()

  const stream = pipeline.obj(
    process.stdin,
    createGunzip(),
    parse({separator: ',', headers: COLUMNS}),
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
