const helpers = require("./helpers")   
function getPagesFromData (data) {
    if (data.length == 0) {
        return []
    }
    let pagesOBJ = {}
    let totalViews = 0
    data.forEach(view => {
        let url = helpers.getURLComponents(view.pageurl)
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
    data.forEach(view => {
        if (view.refferer && view.refferer.length > 1) {
            let url = helpers.getURLComponents(view.refferer)
            //console.log(url.hostname, property.domain)
            if (url.hostname != domain && url.url.length > 1) {
                if (pagesOBJ[view.refferer]) {
                    pagesOBJ[view.refferer].count++
                } else {
                    pagesOBJ[view.refferer] = {
                        url: view.refferer,
                        count: 1
                    }
                }
                totalViews++
            }
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
        if (view.refferer) {
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
    getViewsFromData
}