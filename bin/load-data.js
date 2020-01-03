#!/usr/bin/env node
require('dotenv').config()
const {Transform, finished} = require('stream')
const {promisify} = require('util')
const {pick, chain, countBy} = require('lodash')
const {createGunzip} = require('gunzip-stream')
const {parse} = require('ndjson')
const {beautify} = require('@etalab/adresses-util')
const mongo = require('../lib/utils/mongo')
const {getCommune, getCommunes} = require('../lib/cog')

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

const SOURCES_MAPPING = {
  bal: 'commune-bal',
  'ign-api-gestion-municipal_administration': 'commune-guichet',
  'ign-api-gestion-laposte': 'laposte',
  'ign-api-gestion-sdis': 'sdis',
  'ign-api-gestion-ign': 'ign',
  cadastre: 'cadastre',
  ftth: 'arcep',
  'insee-ril': 'insee'
}

function getSource(rawSource) {
  if (rawSource in SOURCES_MAPPING) {
    return SOURCES_MAPPING[rawSource]
  }
}

function prepareAdresseRow(row) {
  return {
    ...row,
    sourceNomVoie: getSource(row.sourceNomVoie),
    sourcePosition: getSource(row.sourcePosition),
    sources: row.sources.map(s => getSource(s)),
    adressesOriginales: row.adressesOriginales.map(a => ({...a, source: getSource(a.source)}))
  }
}

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
  const {currentCommune, communeVoies, communeNumeros, handledCommunes} = context

  if (currentCommune && communeVoies.length > 0 && communeNumeros.length > 0) {
    const commune = getCommune(currentCommune)
    const sources = chain(communeVoies).map('sources').flatten().uniq().value()

    if (!commune) {
      throw new Error(`Commune ${currentCommune} introuvable`)
    }

    const communeMetrics = {
      codeCommune: currentCommune,
      codeDepartement: commune.departement,
      adressesCount: communeNumeros.length,
      voiesCount: communeVoies.length,
      sourcesNomsVoies: countBy(communeVoies, 'sourceNomVoie'),
      sourcesPositions: countBy(communeNumeros, 'sourcePosition'),
      sources,
      type: sources.includes('commune-bal') ? 'bal' : 'merge'
    }

    if (commune.population) {
      communeMetrics.population = commune.population
      communeMetrics.adressesRatio = Math.round(commune.adressesCount / commune.population * 1000)
    }

    await mongo.db.collection('communes').insertOne(communeMetrics)
    await mongo.db.collection('voies').insertMany(communeVoies)
    await mongo.db.collection('numeros').insertMany(communeNumeros)

    handledCommunes.add(currentCommune)
  }

  context.communeVoies = []
  context.communeNumeros = []
}

async function finish(context) {
  const {handledCommunes} = context

  // On commence par traiter toutes les communes qui n'ont pas d'adresses
  const communesMetrics = getCommunes().filter(c => !handledCommunes.has(c.code)).map(commune => {
    return {
      codeCommune: commune.code,
      codeDepartement: commune.departement,
      population: commune.population,
      adressesCount: 0,
      voiesCount: 0,
      sourcesNomsVoies: {},
      sourcesPositions: {},
      sources: [],
      type: 'empty'
    }
  })

  await mongo.db.collection('communes').insertMany(communesMetrics)
}

async function main() {
  await mongo.connect()

  const context = {
    currentVoie: undefined,
    currentCommune: undefined,
    adressesVoie: [],
    communeVoies: [],
    communeNumeros: [],
    handledCommunes: new Set()
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

          context.adressesVoie.push(prepareAdresseRow(row))

          done()
        },
        async flush(done) {
          handleAdressesVoie(context)
          await handleCommune(context)
          await finish(context)
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

