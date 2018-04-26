#!/usr/bin/env node
const {resolve} = require('path')

const {getCodesDepartements} = require('../lib/cog')
const prepareData = require('../lib/prepare-data')

const codesDepartements = getCodesDepartements()

function getDepartements() {
  if (!process.env.DEPARTEMENTS) {
    return codesDepartements
  }
  const departements = process.env.DEPARTEMENTS.split(',')
  if (departements.length === 0) {
    throw new Error('La liste de départements fournie est mal formée')
  }
  if (departements.some(codeDep => !codesDepartements.includes(codeDep))) {
    throw new Error('La liste de départements fournie est invalide')
  }
  return departements
}

const options = {departements: getDepartements()}

if (process.env.BAN_SOURCE_PATTERN) {
  options.banSourcePattern = resolve(process.env.BAN_SOURCE_PATTERN)
}

if (process.env.BANO_SOURCE_PATTERN) {
  options.banoSourcePattern = resolve(process.env.BANO_SOURCE_PATTERN)
}

if (process.env.CADASTRE_SOURCE_PATTERN) {
  options.cadastreSourcePattern = resolve(process.env.CADASTRE_SOURCE_PATTERN)
}

if (process.env.ADDOK_FILE_PATTERN) {
  options.addokFilePattern = resolve(process.env.ADDOK_FILE_PATTERN)
}

prepareData(options)
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
