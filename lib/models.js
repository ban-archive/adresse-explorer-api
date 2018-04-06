const mongo = require('./utils/mongo')

function getVoies(codeCommune) {
  return mongo.db.collection('adresses').aggregate([
    {$match: {codeCommune}},
    {$group: {
      _id: '$codeVoie',
      idVoie: {$first: '$idVoie'},
      numeros: {$addToSet: '$numero'},
      nomsVoie: {$addToSet: '$nomVoie'},
      sources: {$addToSet: '$source'}
    }},
    {$project: {
      _id: 0,
      idVoie: 1,
      codeVoie: '$_id',
      nbNumeros: {$size: '$numeros'},
      nomsVoie: 1,
      sources: 1
    }}
  ]).toArray()
}

function getNumeros(idVoie) {
  return mongo.db.collection('adresses').aggregate([
    {$match: {idVoie}},
    {$group: {
      _id: '$numero',
      positions: {$addToSet: '$position'},
      sources: {$addToSet: '$source'}
    }},
    {$project: {
      _id: 0,
      numero: '$_id',
      positions: 1,
      sources: 1
    }}
  ]).toArray()
}

module.exports = {
  getVoies,
  getNumeros
}
