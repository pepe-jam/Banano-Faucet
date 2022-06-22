const MongoClient = require('mongodb').MongoClient;
const uri = "mongodb+srv://banoboto:" + encodeURIComponent(process.env.dbpass) + "@banano-faucet.iqkpgjp.mongodb.net/?retryWrites=true&w=majority?directConnection=true";
const client = new MongoClient(uri, {useNewUrlParser: true, useUnifiedTopology: true});

module.exports = {
    getDb: async function () {
        try {
            await client.connect();
        } catch (error) {
            console.error(error);
        }
        return client.db('db');
    },
};