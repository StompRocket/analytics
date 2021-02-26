const sha512 = require("crypto-js/sha512")
const keys = require('./private/keys.json')
const MongoClient = require('mongodb').MongoClient;
const uri = `mongodb+srv://app:${keys.mongo.pass}@cluster0.zejsy.mongodb.net/analyticsDB?retryWrites=true&w=majority`;
const Agenda = require("agenda")
var uuid = require('uuid');

const agenda = new Agenda({ db: { address: uri, collection: 'sys-tasks' } });
 
agenda.define("clean ip cache", async (job) => {
    console.log("cleaning ip cache", new Date().toTimeString())
    let client = await MongoClient.connect(uri)
    const ipCahce = client.db("analyticsDB").collection("ipCahce");
   let res = await ipCahce.deleteMany({
        timestamp: {
        $gt: new Date().toISOString()
        }
   })
    console.log(res.deletedCount, "deleted")
    client.close()

});

(async function () {
  // IIFE to give access to async/await
  await agenda.start();
agenda.schedule("now", "clean ip cache")
  await agenda.every("1 hours", "clean ip cache");

 
})();