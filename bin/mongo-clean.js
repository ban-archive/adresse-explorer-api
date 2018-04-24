#!/usr/env/bin node
const mongo = require('../lib/utils/mongo')

const COLLECTIONS = ['numeros', 'voies']

async function cleanCollection(collection) {
  await collection.dropAllIndexes()
  await collection.remove({})
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

main().catch(err => {
  console.error(err)
  process.exit(1)
})
