const sha512 = require("crypto-js/sha512")
const keys = require('./private/keys.json')
const MongoClient = require('mongodb').MongoClient;
const uri = `mongodb+srv://app:${keys.mongo.pass}@cluster0.zejsy.mongodb.net/analyticsDB?retryWrites=true&w=majority`;
var uuid = require('uuid');
let mongoDB = new MongoClient({
    useUnifiedTopology: true
})
const fetch = require("node-fetch")

async function getLocationFromIP (ip) { 
    let url = `https://freegeoip.app/json/${ip}`
    try {
        let res = await fetch(url)
        let data = await res.json()
        //console.log(data)
        if (data["country_name"]) {
         
            return {
                country: data["country_name"],
                region: data["region_name"],
                city: data["city"],
                tz: data["time_zone"],
                source: "freegeoip.app"
            }
        } else { 
            return {
                 country: "",
                region: "",
              city: "",
                tz: ""
            }
        }
    } catch (err) { 
        console.log('error', err)
          return {
                country: "",
                region: "",
              city: "",
                tz: ""
            }
    }
    

}
async function getLocationFromIPCache(ip) {
  MongoClient.connect(uri, function (err, client) {
    let hash = sha512(ip).toString()
    console.log(err)
    const ipCahce = client.db("analyticsDB").collection("ipCahce");
    ipCahce.find({"_id": hash}).toArray()
  })
}

/* 
fetch('http://ipwhois.app/json/' + ip)
                    .then(res => res.json())
                    .then(async json => {
                        console.log(json["completed_requests"], request.info.host);
                        */
getLocationFromIPCache("2600:1700:9580:b410:bcb9:e9ac:9e4d:c902")

//https://nominatim.org/release-docs/develop/api/Reverse/

module.exports = {getLocationFromIP}
