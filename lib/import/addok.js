const {uniq} = require('lodash')

function convertToHN(numeros) {
  const housenumbers = {}
  numeros.forEach(n => {
    const hn = {id: n.id}
    if (n.position) {
      [hn.lon, hn.lat] = n.position.coordinates
    } else {
      [hn.lon, hn.lat] = [0, 0]
    }
    housenumbers[n.numero] = hn
  })
  return housenumbers
}

function convertToAddok(voie) {
  const hn = convertToHN(voie.numeros || [])
  return {
    id: voie.idVoie,
    type: 'street',
    name: voie.entries.map(e => e.nomVoie),
    postcode: uniq(voie.numeros.filter(n => n.codePostal).map(n => n.codePostal)),
    citycode: voie.codeCommune,
    city: voie.nomCommune,
    housenumbers: hn,
    importance: 0.1,
    lat: 0,
    lon: 0
  }
}

module.exports = {convertToAddok}
