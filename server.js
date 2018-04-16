/* eslint unicorn/no-process-exit: off */
const express = require('express')
const cors = require('cors')
const {createClient} = require('./lib/ban/client')
const wrap = require('./lib/utils/wrap')
const mongo = require('./lib/utils/mongo')
const db = require('./lib/models')

const app = express()

app.use(cors())

const client = createClient({
  clientId: process.env.BAN_CLIENT_ID,
  clientSecret: process.env.BAN_CLIENT_SECRET,
  baseUrl: process.env.BAN_API_URL || 'https://api-ban.ign.fr'
})

app.get('/ban/communes/:codeCommune', wrap(req => {
  return client.getCommune(req.params.codeCommune)
}))

app.get('/ban/communes/:codeCommune/voies', wrap(req => {
  return client.getVoies(req.params.codeCommune)
}))

app.get('/ban/voies/:id', wrap(req => {
  return client.getNumerosVoie(req.params.id)
}))

app.get('/explore/:codeCommune', wrap(async req => {
  const voies = await db.getVoies(req.params.codeCommune)
  return {voies}
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
