const {callbackify} = require('util')
const bluebird = require('bluebird')
const {memoize, max, union, pick, mapValues, first, groupBy} = require('lodash')
const {feature, featureCollection, center, distance} = require('@turf/turf')
const {normalizeBase, createFantoirMatcher} = require('@etalab/adresses-util')
const debug = require('debug')('adresse:import')
const mongo = require('../utils/mongo')
const loadBAN = require('./load/ban-v0')
const loadBANO = require('./load/bano')
const loadCadastre = require('./load/cadastre')
const loadFtth = require('./load/ftth')
const loadBAL = require('./load/bal')
const {convertToAddok, getMunicipalities} = require('./addok')
const {writeGzippedNDJSONFile} = require('./utils')

const VOIE_PROPERTIES = [
  'source',
  'nomVoie',
  'codeVoie',
  'idVoie',
  'codeCommune',
  'nomCommune'
]

// Choix arbitraire pour le moment
function getBestEntry(sources) {
  return sources.bal || sources.ban || sources.ftth || sources.cadastre || sources.bano
}

function createConsolidatedNumero(entries) {
  const bestEntry = getBestEntry(entries)
  const numero = pick(bestEntry, 'id', 'numero', 'codeCommune', 'idVoie', 'codePostal', 'libelleAcheminement', 'position')
  if (numero.numero.match(/^([56789]\d{3})/)) {
    numero.pseudoNumero = true
  }
  if (entries.cadastre) {
    numero.destination = entries.cadastre.extras.destination
    numero.parcelles = entries.cadastre.extras.parcelles
    numero.adresseUtile = entries.cadastre.extras.adresseUtile
  }
  if (numero.pseudoNumero && !entries.cadastre) {
    numero.pseudoNumeroOrphelin = true
  }
  if (numero.adresseUtile) {
    numero.active = true
  } else if (numero.pseudoNumeroOrphelin) {
    numero.active = false
  } else {
    numero.active = true
  }
  numero.sources = Object.keys(entries).filter(sourceName => entries[sourceName])
  numero.entries = Object.values(entries).filter(Boolean).map(e => pick(e, 'source', 'originalId', 'codePostal', 'libelleAcheminement', 'extras', 'position'))
  const positions = numero.entries.filter(e => e.position).map(e => feature(e.position, {}))
  if (positions.length > 1) {
    const centrePositions = center(featureCollection(positions))
    numero.distanceMaxPositions = max(positions.map(p => distance(p, centrePositions) * 1000))
    numero.centrePositions = centrePositions.geometry
  }
  return numero
}

function createConsolidatedVoie(entries) {
  const bestEntry = getBestEntry(entries)
  const voie = pick(bestEntry, 'idVoie', 'codeVoie', 'nomVoie', 'codeCommune', 'nomCommune')
  voie.sources = Object.keys(entries).filter(sourceName => entries[sourceName])
  voie.entries = Object.values(entries).filter(Boolean).map(e => pick(e, 'source', 'nomVoie'))
  return voie
}

function createConsolidatedNumeros(sources, idVoie) {
  const idNumeros = union(...Object.values(sources).map(source => {
    return idVoie in source.idVoieGroupedAdresses ? source.idVoieGroupedAdresses[idVoie].map(a => a.id) : []
  }))
  return idNumeros.map(idNumero => {
    return createConsolidatedNumero(mapValues(sources, ({idVoieGroupedAdresses}) => {
      return idVoie in idVoieGroupedAdresses ? idVoieGroupedAdresses[idVoie].find(a => a.id === idNumero) : null
    }))
  })
}

function createConsolidatedVoies(sources) {
  const idVoies = union(...Object.values(sources).map(source => Object.keys(source.idIndexedVoies)))
  return idVoies.map(idVoie => {
    return createConsolidatedVoie(mapValues(sources, ({idIndexedVoies}) => {
      return idVoie in idIndexedVoies ? idIndexedVoies[idVoie] : null
    }))
  })
}

function createCodeVoie(nomVoie) {
  return normalizeBase(nomVoie).replace(/\W/g, '-')
}

async function recomputeCodesVoies(adressesCommune) {
  const {codeCommune} = first(adressesCommune)
  const fantoir = await createFantoirMatcher(codeCommune)
  const findCodeVoie = memoize((nomVoie => fantoir.findCodeVoie(nomVoie)))
  adressesCommune.forEach(adresse => {
    adresse.originalCodeVoie = adresse.codeVoie
    adresse.codeVoie = findCodeVoie(adresse.nomVoie) || adresse.originalCodeVoie || createCodeVoie(adresse.nomVoie)
    adresse.idVoie = `${codeCommune}-${adresse.codeVoie}`
    adresse.id = `${adresse.idVoie}-${adresse.numero}`
  })
}

async function prepareSource(adressesPromise, recomputeCodeVoieFlag = false) {
  const adresses = await adressesPromise
  if (recomputeCodeVoieFlag) {
    await bluebird.each(
      Object.values(groupBy(adresses, 'codeCommune')),
      recomputeCodesVoies
    )
  }
  const idVoieGroupedAdresses = groupBy(adresses, 'idVoie')
  const idIndexedVoies = mapValues(idVoieGroupedAdresses, adresses => {
    return pick(first(adresses), ...VOIE_PROPERTIES)
  })
  return {idVoieGroupedAdresses, idIndexedVoies}
}

async function prepareData({departement, banPath, banoPath, cadastrePath, ftthPath, balPath, addokFilePath}) {
  console.log(`Préparation du département ${departement}`)

  await mongo.connect()

  debug('démarrage de l’importation')

  const sources = await bluebird.props({
    ban: prepareSource(loadBAN(banPath), true),
    bano: prepareSource(loadBANO(banoPath), true),
    cadastre: prepareSource(loadCadastre(cadastrePath)),
    ftth: prepareSource(loadFtth(ftthPath)),
    bal: prepareSource(loadBAL(balPath))
  })

  debug('fin de lecture des sources')

  const consolidatedVoies = createConsolidatedVoies(sources)
  const consolidatedNumeros = []

  consolidatedVoies.forEach(voie => {
    const numeros = createConsolidatedNumeros(sources, voie.idVoie)
    const destination = new Set()
    numeros.forEach(n => {
      if (n.destination) {
        n.destination.forEach(d => destination.add(d))
      }
    })
    voie.destination = [...destination]
    voie.active = numeros.some(n => n.active)
    voie.numeros = numeros
    consolidatedNumeros.push(...numeros)
  })

  debug('fin de préparation des données')

  await mongo.db.collection('voies').insertMany(consolidatedVoies.map(voie => {
    return {...voie, numeros: voie.numeros.length}
  }))
  await mongo.db.collection('numeros').insertMany(consolidatedNumeros)
  debug('fin de l’import dans MongoDB')

  if (addokFilePath) {
    await writeGzippedNDJSONFile(
      consolidatedVoies.map(convertToAddok).concat(getMunicipalities(departement)),
      addokFilePath
    )
    debug('fin de production du fichier Addok')
  }

  await mongo.disconnect()
}

module.exports = callbackify(prepareData)
