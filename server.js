#!/usr/bin/env node
require('dotenv').config()
const express = require('express')
const cors = require('cors')
const w = require('./lib/utils/wrap')
const mongo = require('./lib/utils/mongo')
const db = require('./lib/models')

const app = express()

function badRequest(res, message) {
  return res.status(400).send({
    code: 400,
    message
  })
}

function toCleInterop(codeCommuneVoie, codeVoie, numero, suffixe) {
  const paddedNumero = numero ? numero.padStart(5, '0') : null

  return [codeCommuneVoie, codeVoie, paddedNumero, suffixe]
    .filter(Boolean)
    .join('_')
    .toLowerCase()
}

app.use(cors({origin: true}))

app.get('/:codeCommune', w(async (req, res) => {
  const {codeCommune} = req.params
  const communeMetrics = await db.getCommuneMetrics(codeCommune)

  if (!communeMetrics) {
    return res.sendStatus(404)
  }

  res.send(communeMetrics)
}))

app.get('/:codeCommune/numeros', w(async (req, res) => {
  if (!req.query.bbox) {
    return badRequest(res, 'bbox is required')
  }

  const bbox = req.query.bbox.split(',').map(Number.parseFloat)
  if (bbox.length !== 4 || bbox.some(Number.isNaN)) {
    return badRequest(res, 'bbox is malformed')
  }

  const numeros = await db.getNumerosByBoundingBox(req.params.codeCommune, bbox)

  res.send(numeros)
}))

app.get('/:codeCommuneVoie/:codeVoie', w(async (req, res) => {
  const cleInterop = toCleInterop(req.params.codeCommuneVoie, req.params.codeVoie)
  const voie = await db.getVoie(cleInterop)

  if (!voie) {
    return res.sendStatus(404)
  }

  res.send(voie)
}))

app.get('/:codeCommuneVoie/:codeVoie/:numeroComplet', w(async (req, res) => {
  const [, numero, suffixe] = req.params.numeroComplet.match(/^(\d+)(\w*)$/)
  const cleInterop = toCleInterop(req.params.codeCommuneVoie, req.params.codeVoie, numero, suffixe)
  const adresse = await db.getNumero(cleInterop)

  if (!adresse) {
    return res.sendStatus(404)
  }

  res.send(adresse)
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
