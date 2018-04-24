#!/usr/bin/env node
const {join} = require('path')

const doImport = require('../lib/import')

const DATA_DIR = join(__dirname, '..', 'data')
const BAN_PATH = join(DATA_DIR, 'BAN_licence_gratuite_repartage_54.zip')
const BANO_PATH = join(DATA_DIR, 'bano-54.csv.gz')
const CADASTRE_PATH = join(DATA_DIR, 'adresses-cadastre-54.ndjson.gz')

doImport({banPath: BAN_PATH, banoPath: BANO_PATH, cadastrePath: CADASTRE_PATH, importInMongo: false})
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
