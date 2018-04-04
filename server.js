const express = require('express')
const cors = require('cors')
const {createClient} = require('./lib/ban/client')
const wrap = require('./lib/utils/wrap')

const app = express()

app.use(cors())

const client = createClient({
  clientId: process.env.BAN_CLIENT_ID,
  clientSecret: process.env.BAN_CLIENT_SECRET,
  baseUrl: process.env.BAN_API_URL || 'https://api-ban.ign.fr'
})

app.get('/communes/:codeCommune', wrap(req => {
  return client.getCommune(req.params.codeCommune)
}))

app.get('/communes/:codeCommune/voies', wrap(req => {
  return client.getVoies(req.params.codeCommune)
}))

app.get('/numeros/:id', wrap(req => {
  return client.getNumerosVoie(req.params.id)
}))

const port = process.env.PORT || 5000

app.listen(port, () => {
  console.log('Start listening on port ' + port)
})
