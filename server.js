/* eslint unicorn/no-process-exit: off */
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

app.get('/explore/:codeCommune/:codeVoie', wrap(req => {
  return db.getVoie(req.params.codeCommune + '-' + req.params.codeVoie)
}))

app.get('/explore/:codeCommune/:codeVoie/:numero', wrap(req => {
  return db.getNumero(req.params.codeCommune + '-' + req.params.codeVoie + '-' + req.params.numero)
}))

const port = process.env.PORT || 5000

async function main() {
  await mongo.connect()

  app.listen(port, () => {
    console.log('Start listening on port ' + port)
  })
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
