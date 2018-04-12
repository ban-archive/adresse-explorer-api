const {MongoClient, ObjectID} = require('mongodb')

class Mongo {
  async connect() {
    this.client = await MongoClient.connect(process.env.MONGODB_URL || 'mongodb://localhost', {
      reconnectTries: 1
    })
    this.db = this.client.db('adresse')
  }

  async disconnect(force) {
    return this.client.close(force)
  }
}

module.exports = new Mongo()
module.exports.ObjectID = ObjectID
