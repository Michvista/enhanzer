const mongodb = require("mongodb")


const MongoClient = mongodb.MongoClient

let database;

async function connect() {
    const client = await MongoClient.connect("mongodb+srv://olumidemichelle:michvic09@enhanzer.wzxaxfo.mongodb.net/"); 

    database = client.db("enhanzer")
  }

function getDb() {
    if (!database) {
        throw {message: "Database connection not established"}
    }
    return database
}

module.exports ={
    connectDatabase: connect,
    getDb: getDb
}