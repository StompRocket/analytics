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
                city: data["city_name"]
            }
        } else { 
            return {
                country: data["country_name"],
                region: data["region_name"],
                city: data["city"]
            }
        }
    } catch (err) { 
        console.log('error', err)
          return {
                country: "",
                region: "",
                city: ""
            }
    }
    

}
//getLocationFromIP("2600:1700:9580:b410:bcb9:e9ac:9e4d:c902")

//https://nominatim.org/release-docs/develop/api/Reverse/

module.exports = {getLocationFromIP}