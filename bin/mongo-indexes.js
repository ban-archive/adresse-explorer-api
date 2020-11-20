#!/usr/env/bin node
require('dotenv').config()
const mongo = require('../lib/utils/mongo')

async function main() {
  await mongo.connect()
  await mongo.db.collection('communes').createIndex({codeCommune: 1})
  await mongo.db.collection('communes').createIndex({codeDepartement: 1})
  await mongo.db.collection('voies').createIndex({codeCommune: 1})
  await mongo.db.collection('voies').createIndex({idVoie: 1})
  await mongo.db.collection('numeros').createIndex({codeCommune: 1})
  await mongo.db.collection('numeros').createIndex({idVoie: 1})
  await mongo.db.collection('numeros').createIndex({codeCommune: 1, position: '2dsphere'})
  await mongo.db.collection('numeros').createIndex({cleInterop: 1})
  await mongo.disconnect()
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
