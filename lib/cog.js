const {keyBy} = require('lodash')
const departements = require('@etalab/cog/data/departements.json')
const communes = require('@etalab/cog/data/communes.json')

const communesIndex = keyBy(communes, 'code')
const departementsIndex = keyBy(departements, 'code')

function getDepartementByCommune(codeCommune) {
  const commune = communesIndex[codeCommune]
  if (commune && commune.departement) {
    return departementsIndex[commune.departement]
  }
}

function getCodesDepartements() {
  return Object.keys(departementsIndex)
}

module.exports = {getDepartementByCommune, getCodesDepartements}
