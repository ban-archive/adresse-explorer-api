const mongo = require('./utils/mongo')

function getVoies(codeCommune) {
  return mongo.db.collection('voies').find({codeCommune}).project({entries: 0, _id: 0}).toArray()
}

function getNumeros(idVoie) {
  return mongo.db.collection('numeros')
    .find({idVoie})
    .project({entries: 0, centrePositions: 0, codePostal: 0, libelleAcheminement: 0, _id: 0})
    .toArray()
}

async function getVoie(idVoie) {
  const voie = await mongo.db.collection('voies').findOne({idVoie})
  const numeros = await getNumeros(idVoie)
  voie.numeros = numeros
  return voie
}

function getNumero(id) {
  return mongo.db.collection('numeros').findOne({id})
}

module.exports = {
  getVoies,
  getNumeros,
  getVoie,
  getNumero
}
