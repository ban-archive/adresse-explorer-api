#!/usr/env/bin node
require('dotenv').config()
const mongo = require('../lib/utils/mongo')

const COLLECTIONS = ['numeros', 'voies']

async function cleanCollection(collection) {
  await collection.dropIndexes()
  await collection.removeMany({})
}

async function main() {
  await mongo.connect()

  const collections = await mongo.db.collections()
  await Promise.all(
    collections
      .filter(c => COLLECTIONS.includes(c.collectionName))
      .map(cleanCollection)
  )

  await mongo.disconnect()
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
