const bluebird = require('bluebird')
const {max, intersection, union, pick, mapValues, first, groupBy} = require('lodash')
const {feature, featureCollection, center, distance} = require('@turf/turf')
const debug = require('debug')('adresse:import')
const mongo = require('../utils/mongo')
const loadBAN = require('./load/ban')
const loadBANO = require('./load/bano')
const loadCadastre = require('./load/cadastre')

const VOIE_PROPERTIES = [
  'source',
  'nomVoie',
  'codeVoie',
  'idVoie',
  'codeCommune',
  'nomCommune'
]

const NUMERO_PROPERTIES = [
  'source',
  'id',
  'originalId',
  'numero',
  'idVoie',
  'codePostal',
  'libelleAcheminement',
  'position',
  'extras'
]

const ACTIVE_DESTINATIONS = ['habitation', 'commerce', 'site-industriel', 'site-touristique']

// Choix arbitraire pour le moment
function getBestEntry(sources) {
  return sources.ban || sources.cadastre || sources.bano
}

function createConsolidatedNumero(entries) {
  const bestEntry = getBestEntry(entries)
  const numero = pick(bestEntry, 'id', 'numero', 'idVoie', 'codePostal', 'libelleAcheminement', 'position')
  if (numero.numero.match(/^([56789]\d{3})/)) {
    numero.pseudoNumero = true
  }
  if (entries.cadastre) {
    numero.destination = entries.cadastre.extras.destination
    numero.parcelles = entries.cadastre.extras.parcelles
  }
  if (numero.pseudoNumero && !entries.cadastre) {
    numero.pseudoNumeroOrphelin = true
  }
  if (numero.destination) {
    numero.active = intersection(numero.destination, ACTIVE_DESTINATIONS).length > 0
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

async function prepareSource(adressesPromise) {
  const idVoieGroupedAdresses = groupBy(await adressesPromise, 'idVoie')
  const idIndexedVoies = mapValues(idVoieGroupedAdresses, adresses => {
    return pick(first(adresses), ...VOIE_PROPERTIES)
  })
  return {idVoieGroupedAdresses, idIndexedVoies}
}

async function doImport({banPath, banoPath, cadastrePath}) {
  await mongo.connect()

  debug('démarrage de l’importation')

  const sources = await bluebird.props({
    ban: prepareSource(loadBAN(banPath)),
    bano: prepareSource(loadBANO(banoPath)),
    cadastre: prepareSource(loadCadastre(cadastrePath))
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
    voie.numeros = numeros.length
    consolidatedNumeros.push(...numeros)
  })

  await mongo.db.collection('voies').insertMany(consolidatedVoies)
  await mongo.db.collection('numeros').insertMany(consolidatedNumeros)

  debug('fin de l’import dans la base de données')

  await mongo.disconnect()
}

module.exports = doImport
