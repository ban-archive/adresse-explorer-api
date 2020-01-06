#!/usr/bin/env node
require('dotenv').config()
const express = require('express')
const cors = require('cors')
const wrap = require('./lib/utils/wrap')
const mongo = require('./lib/utils/mongo')
const db = require('./lib/models')
const {getCommune} = require('./lib/cog')
const {buildContoursIndex} = require('./lib/contours')

const app = express()
const contoursIndexPromise = buildContoursIndex()

function badRequest(message) {
  const err = new Error(message)
  err.badRequest = true
  return err
}

function w(handler) {
  return (req, res) => {
    try {
      handler(req, res)
    } catch (error) {
      console.error(error)
      res.status(500).send({
        code: 500,
        message: error.message
      })
    }
  }
}

function toCleInterop(codeCommuneVoie, codeVoie, numero, suffixe) {
  const paddedNumero = numero ? numero.padStart(5, '0') : null

  return [codeCommuneVoie, codeVoie, paddedNumero, suffixe]
    .filter(Boolean)
    .join('_')
    .toLowerCase()
}

app.use(cors())

app.get('/france', wrap(async () => {
  const metrics = await db.getFranceMetrics()
  const contoursIndex = await contoursIndexPromise
  metrics.departements.forEach(d => {
    if (d.codeDepartement in contoursIndex) {
      d.contour = contoursIndex[d.codeDepartement]
    }
  })
  return metrics
}))

app.get('/departement/:codeDepartement', wrap(async req => {
  const metrics = await db.getDepartementMetrics(req.params.codeDepartement)
  const contoursIndex = await contoursIndexPromise
  metrics.communes.forEach(c => {
    c.nomCommune = getCommune(c.codeCommune).nom
    if (c.codeCommune in contoursIndex) {
      c.contour = contoursIndex[c.codeCommune]
    }
  })
  return metrics
}))

app.get('/:codeCommune', wrap(async req => {
  const {codeCommune} = req.params
  const voies = await db.getVoies(codeCommune)
  const communeMetrics = (await db.getCommuneMetrics(codeCommune)) || {}
  return {...communeMetrics, voies}
}))

app.get('/:codeCommune/numeros', wrap(req => {
  if (!req.query.bbox) {
    throw badRequest('bbox is required')
  }

  const bbox = req.query.bbox.split(',').map(Number.parseFloat)
  if (bbox.length !== 4 || bbox.some(Number.isNaN)) {
    throw badRequest('bbox is malformed')
  }

  return db.getNumerosByBoundingBox(req.params.codeCommune, bbox)
}))

app.get('/:codeCommuneVoie/:codeVoie', w(async (req, res) => {
  const cleInterop = toCleInterop(req.params.codeCommuneVoie, req.params.codeVoie)
  const voie = await db.getVoie(cleInterop)

  if (!voie) {
    return res.sendStatus(404)
  }

  res.send(voie)
}))

app.get('/:codeCommuneVoie/:codeVoie/:numeroComplet', wrap(req => {
  const [, numero, suffixe] = req.params.numeroComplet.match(/^(\d+)(\w*)$/)
  const cleInterop = toCleInterop(req.params.codeCommuneVoie, req.params.codeVoie, numero, suffixe)
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
