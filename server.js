#!/usr/bin/env node
require('dotenv').config()
const express = require('express')
const cors = require('cors')
const wrap = require('./lib/utils/wrap')
const mongo = require('./lib/utils/mongo')
const db = require('./lib/models')

const app = express()

function badRequest(message) {
  const err = new Error(message)
  err.badRequest = true
  return err
}

function toCleInterop(codeCommuneVoie, codeVoie, numero, suffixe) {
  const paddedNumero = numero ? numero.padStart(5, '0') : null

  return [codeCommuneVoie, codeVoie, paddedNumero, suffixe]
    .filter(Boolean)
    .join('_')
    .toLowerCase()
}

app.use(cors())

app.get('/explore/:codeCommune', wrap(async req => {
  const voies = await db.getVoies(req.params.codeCommune)
  return {voies}
}))

app.get('/explore/:codeCommune/numeros', wrap(req => {
  if (!req.query.bbox) {
    throw badRequest('bbox is required')
  }

  const bbox = req.query.bbox.split(',').map(Number.parseFloat)
  if (bbox.length !== 4 || bbox.some(Number.isNaN)) {
    throw badRequest('bbox is malformed')
  }

  return db.getNumerosByBoundingBox(req.params.codeCommune, bbox)
}))

app.get('/explore/:codeCommuneVoie/:codeVoie', wrap(req => {
  const cleInterop = toCleInterop(req.params.codeCommuneVoie, req.params.codeVoie)
  return db.getVoie(cleInterop)
}))

app.get('/explore/:codeCommuneVoie/:codeVoie/:numero', wrap(req => {
  const cleInterop = toCleInterop(req.params.codeCommuneVoie, req.params.codeVoie, req.params.numero)
  return db.getNumero(cleInterop)
}))

app.get('/explore/:codeCommuneVoie/:codeVoie/:numero/:suffixe', wrap(req => {
  const cleInterop = toCleInterop(req.params.codeCommuneVoie, req.params.codeVoie, req.params.numero, req.params.suffixe)
  return db.getNumero(cleInterop)
}))

const port = process.env.PORT || 5000

async function main() {
  await mongo.connect()

  app.listen(port, () => {
    console.log('Start listening on port ' + port)
  })
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
