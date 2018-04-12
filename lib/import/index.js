const bluebird = require('bluebird')
const mongo = require('../utils/mongo')
const loadBAN = require('./load/ban')
const loadBANO = require('./load/bano')
const loadCadastre = require('./load/cadastre')

async function doImport({banPath, banoPath, cadastrePath}) {
  await mongo.connect()

  const adresses = await bluebird.props({
    ban: loadBAN(banPath),
    bano: loadBANO(banoPath),
    cadastre: loadCadastre(cadastrePath)
  })

  await mongo.db.collection('adresses').insertMany(adresses.ban)
  await mongo.db.collection('adresses').insertMany(adresses.bano)
  await mongo.db.collection('adresses').insertMany(adresses.cadastre)

  await mongo.disconnect()
}

module.exports = doImport
