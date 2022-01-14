const helpers = require("./helpers") 
const langs = require("./langaugeCodes.json")  
function getPagesFromData (data) {
    if (data.length == 0) {
        return []
    }
    let pagesOBJ = {}
    let totalViews = 0
    data.forEach(view => {
        let url = helpers.getURLComponents(view.pageurl, true)
        if (pagesOBJ[url.page]) {
            pagesOBJ[url.page].count++
        } else {
            pagesOBJ[url.page] = {
                url: view.pageurl,
                count: 1
            }
        }
        totalViews++
        
    })
    let pages = []
    Object.keys(pagesOBJ).forEach(key => {
        pages.push({
            path: key,
            views: pagesOBJ[key].count
        })
    })
    return pages
}

function getRefferersFromData(data, domain) {
    if (data.length == 0) {
        return []
    }
    let pagesOBJ = {}
    let totalViews = 0
    //console.log(data)
    data.forEach(view => {
      //console.log(view)
        if (view.refferer && view.refferer.length > 1) {
          let url = helpers.getURLComponents(view.refferer)
          //console.log(url.hostname, url, view.refferer)
            var cleanRefferer = view.refferer.replace(/\/+$/, '')
            if (url.hostname != domain && url.url.length > 1) {
                if (pagesOBJ[cleanRefferer]) {
                    pagesOBJ[cleanRefferer].count++
                } else {
                    pagesOBJ[cleanRefferer] = {
                        url: cleanRefferer,
                        count: 1
                    }
                }
                totalViews++
            }
        }
        let viewURL = helpers.getURLComponents(view.pageurl)
        let ref = helpers.getQueryStringParams("r", view.pageurl)

        //console.log("current view url", viewURL.page, ref)
       if (ref) {
        // console.log(ref)
         
          if (pagesOBJ[ref]) {
              pagesOBJ[ref].count++
          } else {
              pagesOBJ[ref] = {
                  url: ref,
                  count: 1
              }
          }
          totalViews++
      
       }
        
        
    })
    let pages = []
    Object.keys(pagesOBJ).forEach(key => {
        pages.push({
            path: key,
            views: pagesOBJ[key].count
        })
    })
    return pages
}

function getBrowsersFromData(data) {
    if (data.length == 0) {
        return []
    }
    let pagesOBJ = {}
    let totalViews = 0
    data.forEach(view => {
        let browser = view.browser.name
        if (pagesOBJ[browser]) {
            pagesOBJ[browser].count++
        } else {
            pagesOBJ[browser] = {
                
                count: 1
            }
        }
        totalViews++
        
    })
    let pages = []
    Object.keys(pagesOBJ).forEach(key => {
        pages.push({
            name: key,
            views: pagesOBJ[key].count
        })
    })
    return pages
}

function getOSFromData(data) {
    if (data.length == 0) {
        return []
    }
    let pagesOBJ = {}
    let totalViews = 0
    data.forEach(view => {
        let browser = view.browser.os
        if (pagesOBJ[browser]) {
            pagesOBJ[browser].count++
        } else {
            pagesOBJ[browser] = {
                
                count: 1
            }
        }
        totalViews++
        
    })
    let pages = []
    Object.keys(pagesOBJ).forEach(key => {
        pages.push({
            name: key,
            views: pagesOBJ[key].count
        })
    })
    return pages
}
function getLanguagesFrom(data) {
    if (data.length == 0) {
        return []
    }
    let pagesOBJ = {}
    let totalViews = 0
    data.forEach(view => {
    
        let browser = view.language.toLowerCase()
        if (pagesOBJ[browser]) {
            pagesOBJ[browser].count++
        } else {
            pagesOBJ[browser] = {
                
                count: 1
            }
        }
        totalViews++
        
    })
    let pages = []
    Object.keys(pagesOBJ).forEach(key => {
        
        let langCode = key.split("-")
        let name;
        if (langs[langCode[0]]) {
            name = langs[langCode[0]].name
            if (langCode.length > 1) {
                name = name + "-" + langCode[1]
            }
        } else { 
            name = key
        }
     
        
        pages.push({
            name: key,
            formattedName: name,
            views: pagesOBJ[key].count
        })
    })
    return pages
}

function getPlatformsFromData(data) {
    if (data.length == 0) {
        return []
    }
    let pagesOBJ = {}
    let totalViews = 0
    data.forEach(view => {
        let browser = view.platform
        if (pagesOBJ[browser]) {
            pagesOBJ[browser].count++
        } else {
            pagesOBJ[browser] = {
                
                count: 1
            }
        }
        totalViews++
        
    })
    let pages = []
    Object.keys(pagesOBJ).forEach(key => {
        pages.push({
            name: key,
            views: pagesOBJ[key].count
        })
    })
    return pages
}

function getScreensFromData(data) {
    if (data.length == 0) {
        return []
    }
    let screensOBJ = {}
    let totalViews = 0
    data.forEach(view => {
        let browser = `${view.screen.width},${view.screen.height}`
        if (screensOBJ[browser]) {
            screensOBJ[browser].count++
        } else {
            screensOBJ[browser] = {
                
                count: 1
            }
        }
        totalViews++
        
    })
    let pages = []
    Object.keys(screensOBJ).forEach(key => {
        let screen = key.split(",")
        pages.push({
            width: screen[0],
            height: screen[1],
            views: screensOBJ[key].count
        })
    })
    return pages
}

function getLocationsFromData(data) {
    let countries = []
    let regions = []
    let cities = []
    if (data.length == 0) {
        return {
            countries,
            regions,
            cities
        }
    }
    let citiesOBJ = {}
    let regionsOBJ = {}
    let countriesOBJ = {}
    let pagesOBJ = {}
    let totalViews = 0
    data.forEach(view => {
        let location = view.location
        let cityString = `${location.city},${location.region},${location.country}`
        let regionString = `${location.region},${location.country}`
        
        if (citiesOBJ[cityString]) {
            citiesOBJ[cityString].count++
        } else {
            citiesOBJ[cityString] = {
                location: location,
                count: 1
            }
        }
        if (regionsOBJ[regionString]) {
            regionsOBJ[regionString].count++
        } else {
            regionsOBJ[regionString] = {
                location: {
                    country: location.country,
                    flag: location.flag,
                    region: location.region
                },
                count: 1
            }
        }
        if (countriesOBJ[location.country]) {
            countriesOBJ[location.country].count++
        } else {
            countriesOBJ[location.country] = {
                location: {
                    country: location.country,
                    flag: location.flag,
                    
                },
                count: 1
            }
        }
        totalViews++
        
    })
    
    Object.keys(citiesOBJ).forEach(key => {
        cities.push({
            location: citiesOBJ[key].location,
            views: citiesOBJ[key].count
        })
    })
    
    Object.keys(regionsOBJ).forEach(key => {
        regions.push({
            location: regionsOBJ[key].location,
            views: regionsOBJ[key].count
        })
    })
    
    Object.keys(countriesOBJ).forEach(key => {
        countries.push({
            location: countriesOBJ[key].location,
            views: countriesOBJ[key].count
        })
    })
    return {
        countries,
        regions,
        cities
    }
}

function getViewsFromData(data, domain) {
    if (data.length == 0) {
        return {
            views: [],
            visitors: 0
        }
    }
    let views = []
    let totalViews = 0
    data.forEach(view => {
        let landing = true
        if (view.refferer && view.refferer.length > 1) {
            let refferer = helpers.getURLComponents(view.refferer)
            
            
            if (refferer.hostname == domain) {
                landing = false
            }
          //  console.log(landing)
        }
        
        views.push({
            time: view.time,
            page: helpers.getURLComponents(view.pageurl).page,
            landing: landing,
            refferer: view.refferer
        })
        totalViews++
        
    })
    return {
        views,
        visitors: views.filter(a => {
            return a.landing
        }).length
    }
}
module.exports = {
    getLocationsFromData,
    getOSFromData,
    getPagesFromData,
    getPlatformsFromData,
    getRefferersFromData,
    getBrowsersFromData,
    getScreensFromData,
    getViewsFromData,
    getLanguagesFrom
}
