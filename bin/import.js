#!/usr/bin/env node
const {join} = require('path')
const bluebird = require('bluebird')
const mongo = require('../lib/utils/mongo')
const loadBAN = require('../build/load/ban')
const loadBANO = require('../build/load/bano')
const loadCadastre = require('../build/load/cadastre')

const DATA_DIR = join(__dirname, '..', 'data')
const BAN_PATH = join(DATA_DIR, '54_ban_v0.csv.gz')
const BANO_PATH = join(DATA_DIR, 'bano-54.csv.gz')
const CADASTRE_PATH = join(DATA_DIR, 'adresses-cadastre-54.geojson.gz')

async function main() {
  await mongo.connect()

  const adresses = await bluebird.props({
    ban: loadBAN(BAN_PATH),
    bano: loadBANO(BANO_PATH),
    cadastre: loadCadastre(CADASTRE_PATH)
  })

  await mongo.db.collection('adresses').insertMany(adresses.ban)
  await mongo.db.collection('adresses').insertMany(adresses.bano)
  await mongo.db.collection('adresses').insertMany(adresses.cadastre)

  await mongo.disconnect()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
