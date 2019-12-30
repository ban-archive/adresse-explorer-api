const {keyBy} = require('lodash')
const departements = require('@etalab/decoupage-administratif/data/departements.json')
const communes = require('@etalab/decoupage-administratif/data/communes.json')

const communesIndex = keyBy(communes, 'code')
const departementsIndex = keyBy(departements, 'code')

function getDepartementByCommune(codeCommune) {
  const commune = communesIndex[codeCommune]
  if (commune && commune.departement) {
    return departementsIndex[commune.departement]
  }
}

module.exports = {getDepartementByCommune}
