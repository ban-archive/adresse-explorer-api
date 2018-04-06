#!/usr/bin/env node
/* eslint promise/prefer-await-to-then: off */
const {createGunzip} = require('gunzip-stream')
const {through, each, pipeline} = require('mississippi')
const {deburr} = require('lodash')
const parse = require('csv-parser')
const mongo = require('../lib/utils/mongo')

function prepareData(addr, enc, next) {
  if (!addr.number || !addr.nom_voie) {
    return next()
  }
  const codeCommune = addr.code_insee
  const codeVoie = addr.id_fantoir ? addr.id_fantoir.substr(5, 4) : deburr(addr.nom_voie).toLowerCase().replace(/\W/g, '-')
  const numero = addr.number + addr.rep.toLowerCase()
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

async function main() {
  await mongo.connect()

  const stream = pipeline.obj(
    process.stdin,
    createGunzip(),
    parse({separator: ','}),
    through.obj(prepareData)
  )

  function eachLine(line, next) {
    mongo.db.collection('adresses').insertOne(line)
      .then(() => next())
      .catch(next)
  }

  await new Promise((resolve, reject) => {
    each(stream, eachLine, err => {
      if (err) {
        reject(err)
      }
      resolve()
    })
  })

  await mongo.disconnect()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
