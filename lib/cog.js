const {groupBy, keyBy} = require('lodash')
const departements = require('@etalab/decoupage-administratif/data/departements.json')
const communes = require('@etalab/decoupage-administratif/data/communes.json')

const communesIndex = groupBy(communes, 'code')
const departementsIndex = keyBy(departements, 'code')

const PLM = ['75056', '69123', '13055']

function getDepartementByCommune(codeCommune) {
  const commune = getCommune(codeCommune)
  if (commune && commune.departement) {
    return departementsIndex[commune.departement]
  }
}

function getDepartement(codeDepartement) {
  return departementsIndex[codeDepartement]
}

function getCommune(codeCommune) {
  const communes = communesIndex[codeCommune]
  if (communes) {
    return communes.find(c => ['arrondissement-municipal', 'commune-actuelle'].includes(c.type))
  }
}

function getCommunes() {
  return communes
    .filter(c => ['arrondissement-municipal', 'commune-actuelle'].includes(c.type))
    .filter(c => !PLM.includes(c.code))
}

module.exports = {getDepartementByCommune, getCommune, getCommunes, getDepartement}
