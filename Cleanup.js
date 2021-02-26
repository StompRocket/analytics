const sha512 = require("crypto-js/sha512")
const keys = require('./private/keys.json')
const MongoClient = require('mongodb').MongoClient;
const uri = `mongodb+srv://app:${keys.mongo.pass}@cluster0.zejsy.mongodb.net/analyticsDB?retryWrites=true&w=majority`;
const Agenda = require("agenda")
const moment = require("moment")
var uuid = require('uuid');
const helpers = require("./helpers") 
const run = async () => { 
    let client = await MongoClient.connect(uri)
    const viewsDB = client.db("analyticsDB").collection("views");
      const propertiesDB = client.db("analyticsDB").collection("properties");
    let outDated = await viewsDB.find({ "propertyID": "propertyID" }).toArray()
    console.log(outDated.length)
    outDated.forEach(async a => {
        let url = helpers.getURLComponents(a.pageurl)
        console.log(url.hostname)
    })
  /*  outDated.forEach(async a => { 
        let url = helpers.getURLComponents(a.pageurl)
       let id = a["_id"]
         let existing = await propertiesDB.find({
                    domain: url.hostname
         }).toArray();
        if (existing[0]) { 
             console.log(url.hostname)
            console.log(existing[0]["_id"])
            try {
                let res = await viewsDB.updateOne({ "_id": id }, { $set: { propertyID: existing[0]["_id"] }})
                console.log(res)

            } catch (err) { 
                console.log(err)
            }
            
        }
    }) */
  
}
run()