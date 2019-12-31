const {groupBy, keyBy} = require('lodash')
const departements = require('@etalab/decoupage-administratif/data/departements.json')
const communes = require('@etalab/decoupage-administratif/data/communes.json')

const communesIndex = groupBy(communes, 'code')
const departementsIndex = keyBy(departements, 'code')

function getDepartementByCommune(codeCommune) {
  const commune = getCommune(codeCommune)
  if (commune && commune.departement) {
    return departementsIndex[commune.departement]
  }
}

function getCommune(codeCommune) {
  const communes = communesIndex[codeCommune]
  if (communes) {
    return communes.filter(c => ['arrondissement-municipal', 'commune-actuelle'].includes(c.type))
  }
}

module.exports = {getDepartementByCommune, getCommune}
