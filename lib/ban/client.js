/* eslint camelcase: off */
const got = require('got')
const bluebird = require('bluebird')
const {get} = require('lodash')

const GROUP_KIND_MAP = {
  way: 'voie',
  area: 'lieu-dit'
}

function municipality2commune({id, insee, name}) {
  return {
    id: id.substr(17),
    code: insee,
    nom: name
  }
}

function group2voie({alias, fantoir, id, kind, name}) {
  const voie = {
    id: id.substr(10),
    nom: name,
    alias,
    type: GROUP_KIND_MAP[kind]
  }
  if (fantoir) {
    voie.codeVoie = fantoir
  }
  return voie
}

function hn2numero({id, number, ordinal, postcode}) {
  const numeroComplet = `${number}${ordinal ? ordinal : ''}`
  return {
    id: id.substr(16),
    numero: numeroComplet,
    codePostal: get(postcode, 'code', undefined)
  }
}

function pos2position({id, center, kind, source, source_kind}) {
  return {
    id: id.substr(13),
    type: kind,
    source: {name: source, type: source_kind},
    position: center
  }
}

class BANClient {
  constructor({baseUrl, clientId, clientSecret}) {
    this._baseUrl = baseUrl
    this._clientId = clientId
    this._clientSecret = clientSecret
  }

  async generateToken() {
    const gotOptions = {
      body: {
        client_id: this._clientId,
        client_secret: this._clientSecret,
        grant_type: 'client_credentials',
        email: 'adresse@data.gouv.fr',
        contributor_type: 'develop'
      },
      form: true,
      json: true
    }
    const {body} = await got.post(this._baseUrl + '/token', gotOptions)
    this._token = body.access_token
    this._tokenExpiresAt = Date.now() + (body.expires_in * 1000)
    this._tokenScope = body.scope.split(' ')
  }

  async getToken() {
    if (!this._token || Date.now() >= (this._tokenExpiresAt - 10000)) {
      await this.generateToken()
    }
    return this._token
  }

  async buildGotOptions(query = {}) {
    return {
      query,
      json: true,
      headers: {
        authorization: 'Bearer ' + await this.getToken()
      }
    }
  }

  async getCommune(codeCommune) {
    const gotOptions = await this.buildGotOptions({
      fields: ['id', 'insee', 'name'].join(',')
    })
    const {body} = await got(`${this._baseUrl}/municipality/insee:${codeCommune}`, gotOptions)
    return municipality2commune(body)
  }

  async getVoies(codeCommune) {
    const query = {
      municipality: `insee:${codeCommune}`,
      fields: ['alias', 'attributes', 'fantoir', 'id', 'kind', 'name'].join(','),
      limit: 1000
    }
    const gotOptions = await this.buildGotOptions(query)
    const {body} = await got(`${this._baseUrl}/group`, gotOptions)
    return body.collection.map(group2voie)
  }

  async getVoie(codeVoie) {
    const query = {
      fields: ['alias', 'attributes', 'id', 'kind', 'name'].join(',')
    }
    const gotOptions = await this.buildGotOptions(query)
    const key = codeVoie.length === 9 ? `fantoir:${codeVoie}` : `ban-group-${codeVoie}`
    const {body} = await got(`${this._baseUrl}/group/${key}`, gotOptions)
    return group2voie(body)
  }

  async getNumerosVoie(codeVoie) {
    const key = codeVoie.length === 9 ? `fantoir:${codeVoie}` : `ban-group-${codeVoie}`
    const query = {
      limit: 1000,
      group: key,
      fields: ['number', 'ordinal', 'id', 'postcode.code'].join(',')
    }
    const gotOptions = await this.buildGotOptions(query)
    const {body} = await got(`${this._baseUrl}/housenumber`, gotOptions)
    return bluebird.map(body.collection.filter(hn => hn.number), async hn => {
      const numero = hn2numero(hn)
      numero.positions = await this.getPositions(hn.id)
      return numero
    }, {concurrency: 2})
  }

  async getPositions(id) {
    const query = {
      limit: 1000,
      housenumber: id,
      fields: ['id', 'center', 'kind', 'source', 'source_kind'].join(',')
    }
    const gotOptions = await this.buildGotOptions(query)
    const {body} = await got(`${this._baseUrl}/position`, gotOptions)
    return body.collection.map(pos2position)
  }
}

function createClient(options) {
  return new BANClient(options)
}

module.exports = {createClient, BANClient}
