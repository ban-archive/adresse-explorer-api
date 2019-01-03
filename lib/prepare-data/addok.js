const {getCommunesByDepartement} = require('../cog')

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
    postcode: '00000',
    citycode: voie.codeCommune,
    city: voie.nomCommune,
    housenumbers: hn,
    importance: 0.1,
    lat: 0,
    lon: 0
  }
}

function getMunicipalities(codeDep) {
  return getCommunesByDepartement(codeDep).map(commune => ({
    type: 'municipality',
    name: commune.nom,
    city: commune.nom,
    context: codeDep,
    citycode: commune.code,
    postcode: '00000',
    importance: 0.2,
    lat: 0,
    lon: 0
  }))
}

module.exports = {convertToAddok, getMunicipalities}
