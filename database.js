const mongo = require('mongodb');

let client = new mongo.MongoClient("mongodb+srv://banoboto:"+encodeURIComponent(process.env.dbpass)+"@banano-faucet.iqkpgjp.mongodb.net/?retryWrites=true&w=majority", { useNewUrlParser: true, useUnifiedTopology: true })

module.exports = {
  getDb: async function() {
    await client.connect();
    return client.db('db');
  },
};