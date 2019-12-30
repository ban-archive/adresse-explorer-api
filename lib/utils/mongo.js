const {MongoClient, ObjectID} = require('mongodb')

const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost'
const MONGODB_DBNAME = process.env.MONGODB_DBNAME || 'adresses'

class Mongo {
  async connect() {
    this.client = await MongoClient.connect(MONGODB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    })
    this.db = this.client.db(MONGODB_DBNAME)
  }

  async disconnect(force) {
    return this.client.close(force)
  }
}

module.exports = new Mongo()
module.exports.ObjectID = ObjectID
