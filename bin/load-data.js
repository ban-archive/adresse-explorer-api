#!/usr/bin/env node
require('dotenv').config()
const {Transform, finished} = require('stream')
const {promisify} = require('util')
const {pick, chain} = require('lodash')
const {createGunzip} = require('gunzip-stream')
const {parse} = require('ndjson')
const {beautify} = require('@etalab/adresses-util')
const mongo = require('../lib/utils/mongo')

const eos = promisify(finished)

const VOIE_FIELDS = [
  'idVoie',
  'nomVoie',
  'sourceNomVoie',
  'codeCommune',
  'nomCommune'
]

const NUMERO_FIELDS = [
  'idVoie',
  'codeCommune',
  'numero',
  'suffixe',
  'sources',
  'position',
  'sourcePosition',
  'codePostal',
  'libelleAcheminement',
  'adressesOriginales',
  'cleInterop'
]

function handleAdressesVoie(context) {
  if (context.adressesVoie.length > 0) {
    const voie = pick(context.adressesVoie[0], VOIE_FIELDS)
    voie.nomVoie = beautify(voie.nomVoie)
    voie.numerosCount = context.adressesVoie.length
    voie.sources = chain(context.adressesVoie).map('sources').flatten().uniq().value()
    context.communeVoies.push(voie)

    context.communeNumeros.push(...context.adressesVoie.map(a => pick(a, NUMERO_FIELDS)))
  }

  context.adressesVoie = []
}

async function handleCommune(context) {
  if (context.currentCommune && context.communeVoies.length > 0 && context.communeNumeros.length > 0) {
    await context.mongo.db.collection('voies').insertMany(context.communeVoies)
    await context.mongo.db.collection('numeros').insertMany(context.communeNumeros)
  }

  context.communeVoies = []
  context.communeNumeros = []
}

async function main() {
  await mongo.connect()

  const context = {
    mongo,
    currentVoie: undefined,
    currentCommune: undefined,
    adressesVoie: [],
    communeVoies: [],
    communeNumeros: []
  }

  await eos(
    process.stdin
      .pipe(createGunzip())
      .pipe(parse())
      .pipe(new Transform({
        objectMode: true,
        async transform(row, enc, done) {
          if (row.idVoie !== context.currentVoie) {
            handleAdressesVoie(context)
            context.currentVoie = row.idVoie
          }

          if (row.codeCommune !== context.currentCommune) {
            await handleCommune(context)
            context.currentCommune = row.codeCommune
          }

          context.adressesVoie.push(row)

          done()
        },
        async flush(done) {
          handleAdressesVoie(context)
          await handleCommune(context)
          done()
        }
      })).resume()
  )

  await mongo.disconnect()
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})

