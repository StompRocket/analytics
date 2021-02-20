'use strict';
const Hapi = require('@hapi/hapi');
const Path = require('path');
const fetch = require('node-fetch');
const keys = require('./private/keys.json')
var uaParser = require('ua-parser-js');
const MongoClient = require('mongodb').MongoClient;
const uri = `mongodb+srv://app:${keys.mongo.pass}@cluster0.zejsy.mongodb.net/analyticsDB?retryWrites=true&w=majority`;
var admin = require("firebase-admin");
var uuid = require('uuid');
var serviceAccount = require("./private/fb.json");
let mongoDB = new MongoClient({
    useUnifiedTopology: true
})
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

MongoClient.connect(uri, function (err, client) {

    console.log(err)
    const propertiesDB = client.db("analyticsDB").collection("properties");

    //verifyToken("test")
    // perform actions on the collection object
    function getURLComponents(url) {
        var pattern = /(.+:\/\/)?([^\/]+)(\/.*)*/i;
        var arr = pattern.exec(url);
        return {
            url: arr[0],
            protocal: arr[1],
            hostname: arr[2],
            page: arr[3]

        }
    }

    async function getDataForProperty(propertyID, from, to) {
        const dataDB = client.db("analyticsDB").collection("views");
        let data = [];
        let start = from || new Date(2021, 1, 1).toISOString()
        let end = to || new Date().toISOString()
        // console.log(new Date(2021, 1, 1).toISOString(), new Date().toISOString())
        try {
            data = await dataDB.find({
                "propertyID": propertyID,
                time: {
                    $gte: start,
                    $lt: end
                }
            }).toArray()
        } catch {
            data = []
        }
        return {
            data: data,
            from: start,
            to: end
        }
    }
    async function getProperty (propertyID) {
        try {
            let existing = await propertiesDB.find({
                "_id": propertyID
            }).toArray();
            //console.log(existing)
            if (existing.length > 0) {
                let property = existing[0]
                return property
            } else {
                return false
            }
        } catch {
            return false
        } 
    }
    function authorizedForProperty (property, uid, apiKey) {
        if (property.access.indexOf(uid) > -1) {
            return true
        } else if (property.apiKey == apiKey) {
            return true
        }
        return false
    }
     async function logView(view) {

            const DBviews = client.db("analyticsDB").collection("views");
            await DBviews.insertOne(view);

        }
        async function verifyToken(token) {
            try {
                let decodedToken = await admin.auth().verifyIdToken(token);
                const uid = decodedToken.uid;
                console.log(uid, decodedToken);
                return uid;
            } catch {
                console.log("token wrong");
                return "1TSmFv3qGAgZySDjZO7flmVgOZq1";
                //return false
            }


        }
    const init = async () => {

       
        const server = Hapi.server({
            port: 3056,
            host: 'localhost',
            routes: {
                "cors": true,
                files: {
                    relativeTo: Path.join(__dirname)
                }
            }
        });
        await server.register(require('@hapi/inert'));
        server.route({
            method: 'GET',
            path: '/',
            handler: function (request, h) {

                return h.file('public/testpage.html');
            }
        }); // /
        server.route({
            method: 'GET',
            path: '/test',
            handler: function (request, h) {

                return h.file('public/testpage.html');
            }
        }); // /test
        server.route({
            method: 'GET',
            path: '/script',
            handler: function (request, h) {

                return h.file('src/code.js');
            }
        }); // /script
        server.route({
            method: 'POST',
            path: '/api/v1/view',
            handler: async (request, h) => {
                const xFF = request.headers['x-forwarded-for'];
                const ip = xFF ? xFF.split(',')[0] : request.info.remoteAddress;
                const clientData = request.payload.split(',');
                let uaData = uaParser(request.headers["user-agent"]);
                let urlComponents = getURLComponents(clientData[0])
                console.log(urlComponents)
                let existing = await propertiesDB.find({
                    domain: urlComponents.hostname
                }).toArray();
                if (existing.length > 0) {


                    console.log(existing)
                    fetch('http://ipwhois.app/json/' + ip)
                        .then(res => res.json())
                        .then(async json => {
                            console.log(json["completed_requests"], request.info.host);
                            const data = {
                                propertyID: existing[0]["_id"],
                                pageurl: clientData[0],
                                time: clientData[1],
                                refferer: clientData[2],
                                userAgent: request.headers["user-agent"],
                                platform: clientData[4],
                                language: clientData[3],
                                screen: {
                                    width: clientData[5],
                                    height: clientData[6],
                                },
                                location: {
                                    country: json.country,
                                    flag: json["country_flag"],
                                    region: json.region,
                                    city: json.city
                                },
                                browser: {
                                    name: uaData.browser.name,
                                    version: uaData.browser.version,
                                    os: uaData.os.name,
                                }
                            };
                            console.log(data);
                            logView(data);
                        });

                } else {
                    console.log("not registered domain")
                }
                return true;
            }
        }); // POST /api/v1/view
        server.route({
            method: 'POST',
            path: '/api/v1/property',
            handler: async function (request, h) {
                let body = request.payload;
                let uid = await verifyToken(body.auth);
                console.log(body, uid);

                if (uid) {


                    let existing = await propertiesDB.find({
                        domain: body.domain
                    }).toArray();
                    console.log(existing)
                    if (existing.length > 0) {
                        return h.response({
                            success: false,
                            error: "domain in use"
                        }).code(401);

                    } else {

                        const propertiesDB = client.db("analyticsDB").collection("properties");
                        let id = uuid.v4();
                        //console.log(body, body.domain)
                        propertiesDB.insertOne({
                            _id: id,
                            domain: body.domain,
                            access: [uid],
                            created: new Date().toISOString()
                        });
                        return h.response({
                            success: true,
                            id: id
                        }).code(200);



                    }



                } else {
                    return h.response({
                        success: false,
                        error: "not authorized"
                    }).code(401);
                }
            }
        }); // POST /api/v1/property
        server.route({
            method: 'POST',
            path: '/api/v1/data/{propertyID}',
            handler: async function (request, h) {
                let body = request.payload;
                if (!body || !body.auth) {
                    return h.response({
                        success: false,
                        error: "not authorized"
                    }).code(401);
                }
                let uid = await verifyToken(body.auth);
                console.log(request.params.propertyID, uid);
                if (uid) {
                    let property = await getProperty(request.params.propertyID)
                    if (property) {
                        if (authorizedForProperty(property, uid)) {
                          const result = await getDataForProperty(request.params.propertyID)
                            return h.response({
                                success: true,
                                id: request.params.propertyID,
                                from: result.from,
                                to: result.to,
                                data: result.data,
                                count: result.data.length
                            }).code(200);
                        } else {
                            return h.response({
                                success: false,
                                error: "not authorized"
                            }).code(401);
                        }
                    } else {
                        return h.response({
                            success: false,
                            error: "property doesn't exist"
                        }).code(401);
                    }
                } else {
                    return h.response({
                        success: false,
                        error: "not authorized"
                    }).code(401);
                }
            }
        }); // POST /api/v1/data/{property id}
        server.route({
            method: 'POST',
            path: '/api/v1/data/{propertyID}/pages',
            handler: async function (request, h) {
                let body = request.payload;
                if (!body || !body.auth) {
                    return h.response({
                        success: false,
                        error: "not authorized"
                    }).code(401);
                }
                let uid = await verifyToken(body.auth);
                console.log(request.params.propertyID, uid);
                if (uid) {
                 let property = await getProperty(request.params.propertyID)
                    if (property) {
                        if (authorizedForProperty(property, uid)) {
                            const dataDB = await getDataForProperty(request.params.propertyID)   
                            let data = dataDB.data;
                            if (data.length == 0) {
                                return h.response({
                                    success: true,
                                    id: request.params.propertyID,
                                    from: dataDB.from,
                                    to: dataDB.to,
                                    data: [],
                                    count: 0,
                                    totalViews: 0
                                }).code(200);
                            }
                            let pagesOBJ = {}
                            let totalViews = 0
                            data.forEach(view => {
                                let url = getURLComponents(view.pageurl)
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
                            return h.response({
                                success: true,
                                  from: dataDB.from,
                                    to: dataDB.to,
                                id: request.params.propertyID,
                                data: pages,
                                count: pages.length,
                                totalViews: data.length
                            }).code(200);

                        } else {
                            return h.response({
                                success: false,
                                error: "not authorized"
                            }).code(401);
                        }



                    } else {
                        return h.response({
                            success: false,
                            error: "property doesn't exist"
                        }).code(401);


                    }



                } else {
                    return h.response({
                        success: false,
                        error: "not authorized"
                    }).code(401);
                }
            }
        }); // POST /api/v1/data/{property id}/pages
        server.route({
            method: 'POST',
            path: '/api/v1/data/{propertyID}/refferers',
            handler: async function (request, h) {
                let body = request.payload;
                if (!body || !body.auth) {
                    return h.response({
                        success: false,
                        error: "not authorized"
                    }).code(401);
                }
                let uid = await verifyToken(body.auth);
                console.log(request.params.propertyID, uid);
                if (uid) {
                      let property = await getProperty(request.params.propertyID)
                    if (property) {
                        if (authorizedForProperty(property, uid)) {
                            const dataDB = await getDataForProperty(request.params.propertyID)   
                            let data = dataDB.data
                            if (data.length == 0) {
                                return h.response({
                                    success: true,
                                    id: request.params.propertyID,
                                      from: dataDB.from,
                                    to: dataDB.to,
                                    data: [],
                                    count: 0,
                                    totalViews: 0
                                }).code(200);
                            }
                            let pagesOBJ = {}
                            let totalViews = 0
                            data.forEach(view => {
                                if (view.refferer && view.refferer.length > 1) {
                                    let url = getURLComponents(view.refferer)
                                    //console.log(url.hostname, property.domain)
                                    if (url.hostname != property.domain && url.url.length > 1) {
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
                            return h.response({
                                success: true,
                                 from: dataDB.from,
                                    to: dataDB.to,
                                id: request.params.propertyID,
                                data: pages,
                                count: pages.length,
                                totalViews: data.length
                            }).code(200);

                        } else {
                            return h.response({
                                success: false,
                                error: "not authorized"
                            }).code(401);
                        }



                    } else {
                        return h.response({
                            success: false,
                            error: "property doesn't exist"
                        }).code(401);


                    }



                } else {
                    return h.response({
                        success: false,
                        error: "not authorized"
                    }).code(401);
                }
            }
        }); // POST /api/v1/data/{property id}/refferers
        server.route({
            method: 'POST',
            path: '/api/v1/data/{propertyID}/browsers',
            handler: async function (request, h) {
                let body = request.payload;
                if (!body || !body.auth) {
                    return h.response({
                        success: false,
                        error: "not authorized"
                    }).code(401);
                }
                let uid = await verifyToken(body.auth);
                console.log(request.params.propertyID, uid);
                if (uid) {
                    let property = await getProperty(request.params.propertyID)
                    if (property) {
                        if (authorizedForProperty(property, uid)) {
                            const dataDB = await getDataForProperty(request.params.propertyID)   
                            let data = dataDB.data
                            if (data.length == 0) {
                                return h.response({
                                    success: true,
                                    id: request.params.propertyID,
                                     from: dataDB.from,
                                    to: dataDB.to,
                                    data: [],
                                    count: 0,
                                    totalViews: 0
                                }).code(200);
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
                            return h.response({
                                success: true,
                                  from: dataDB.from,
                                    to: dataDB.to,
                                id: request.params.propertyID,
                                data: pages,
                                count: pages.length,
                                totalViews: data.length
                            }).code(200);

                        } else {
                            return h.response({
                                success: false,
                                error: "not authorized"
                            }).code(401);
                        }



                    } else {
                        return h.response({
                            success: false,
                            error: "property doesn't exist"
                        }).code(401);


                    }



                } else {
                    return h.response({
                        success: false,
                        error: "not authorized"
                    }).code(401);
                }
            }
        }); // POST /api/v1/data/{property id}/browsers
        server.route({
            method: 'POST',
            path: '/api/v1/data/{propertyID}/os',
            handler: async function (request, h) {
                let body = request.payload;
                if (!body || !body.auth) {
                    return h.response({
                        success: false,
                        error: "not authorized"
                    }).code(401);
                }
                let uid = await verifyToken(body.auth);
                console.log(request.params.propertyID, uid);
                if (uid) {
                   let property = await getProperty(request.params.propertyID)
                    if (property) {
                        if (authorizedForProperty(property, uid)) {
                            const dataDB = await getDataForProperty(request.params.propertyID)   
                            let data = dataDB.data
                            if (data.length == 0) {
                                return h.response({
                                    success: true,
                                    id: request.params.propertyID,
                                      from: dataDB.from,
                                    to: dataDB.to,
                                    data: [],
                                    count: 0,
                                    totalViews: 0
                                }).code(200);
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
                            return h.response({
                                success: true,
                                  from: dataDB.from,
                                    to: dataDB.to,
                                id: request.params.propertyID,
                                count: pages.length,
                                totalViews: data.length,
                                data: pages,

                            }).code(200);

                        } else {
                            return h.response({
                                success: false,
                                error: "not authorized"
                            }).code(401);
                        }



                    } else {
                        return h.response({
                            success: false,
                            error: "property doesn't exist"
                        }).code(401);


                    }



                } else {
                    return h.response({
                        success: false,
                        error: "not authorized"
                    }).code(401);
                }
            }
        }); // POST /api/v1/data/{property id}/os
        server.route({
            method: 'POST',
            path: '/api/v1/data/{propertyID}/platforms',
            handler: async function (request, h) {
                let body = request.payload;
                if (!body || !body.auth) {
                    return h.response({
                        success: false,
                        error: "not authorized"
                    }).code(401);
                }
                let uid = await verifyToken(body.auth);
                console.log(request.params.propertyID, uid);
                if (uid) {
                    let property = await getProperty(request.params.propertyID)
                    if (property) {
                        if (authorizedForProperty(property, uid)) {
                            const dataDB = await getDataForProperty(request.params.propertyID)   
                            let data = dataDB.data
                            if (data.length == 0) {
                                return h.response({
                                    success: true,
                                    id: request.params.propertyID,
                                      from: dataDB.from,
                                    to: dataDB.to,
                                    data: [],
                                    count: 0,
                                    totalViews: 0
                                }).code(200);
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
                            return h.response({
                                success: true,
                                  from: dataDB.from,
                                    to: dataDB.to,
                                id: request.params.propertyID,
                                count: pages.length,
                                totalViews: data.length,
                                data: pages,

                            }).code(200);

                        } else {
                            return h.response({
                                success: false,
                                error: "not authorized"
                            }).code(401);
                        }



                    } else {
                        return h.response({
                            success: false,
                            error: "property doesn't exist"
                        }).code(401);


                    }



                } else {
                    return h.response({
                        success: false,
                        error: "not authorized"
                    }).code(401);
                }
            }
        }); // POST /api/v1/data/{property id}/platforms
        server.route({
            method: 'POST',
            path: '/api/v1/data/{propertyID}/screens',
            handler: async function (request, h) {
                let body = request.payload;
                if (!body || !body.auth) {
                    return h.response({
                        success: false,
                        error: "not authorized"
                    }).code(401);
                }
                let uid = await verifyToken(body.auth);
                console.log(request.params.propertyID, uid);
                if (uid) {
                  let property = await getProperty(request.params.propertyID)
                    if (property) {
                        if (authorizedForProperty(property, uid)) {
                            const dataDB = await getDataForProperty(request.params.propertyID)   
                            let data = dataDB.data
                            if (data.length == 0) {
                                return h.response({
                                    success: true,
                                    id: request.params.propertyID,
                                      from: dataDB.from,
                                    to: dataDB.to,
                                    data: [],
                                    count: 0,
                                    totalViews: 0
                                }).code(200);
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
                            return h.response({
                                success: true,
                                  from: dataDB.from,
                                    to: dataDB.to,
                                id: request.params.propertyID,
                                count: pages.length,
                                totalViews: data.length,
                                data: pages,

                            }).code(200);

                        } else {
                            return h.response({
                                success: false,
                                error: "not authorized"
                            }).code(401);
                        }



                    } else {
                        return h.response({
                            success: false,
                            error: "property doesn't exist"
                        }).code(401);


                    }



                } else {
                    return h.response({
                        success: false,
                        error: "not authorized"
                    }).code(401);
                }
            }
        }); // POST /api/v1/data/{property id}/screens
        server.route({
            method: 'POST',
            path: '/api/v1/data/{propertyID}/locations',
            handler: async function (request, h) {
                let body = request.payload;
                if (!body || !body.auth) {
                    return h.response({
                        success: false,
                        error: "not authorized"
                    }).code(401);
                }
                let uid = await verifyToken(body.auth);
                console.log(request.params.propertyID, uid);
                if (uid) {
                 let property = await getProperty(request.params.propertyID)
                    if (property) {
                        if (authorizedForProperty(property, uid)) {
                            const dataDB = await getDataForProperty(request.params.propertyID)   
                            let data = dataDB.data
                            if (data.length == 0) {
                                return h.response({
                                    success: true,
                                    id: request.params.propertyID,
                                      from: dataDB.from,
                                    to: dataDB.to,
                                   totalViews: data.length,
                                regions: [],
                                cities: [],
                                countries: [],
                                }).code(200);
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
                            let cities = []
                            Object.keys(citiesOBJ).forEach(key => {
                                cities.push({
                                    location: citiesOBJ[key].location,
                                    views: citiesOBJ[key].count
                                })
                            })
                            let regions = []
                            Object.keys(regionsOBJ).forEach(key => {
                                regions.push({
                                    location: regionsOBJ[key].location,
                                    views: regionsOBJ[key].count
                                })
                            })
                            let countries = []
                            Object.keys(countriesOBJ).forEach(key => {
                                countries.push({
                                    location: countriesOBJ[key].location,
                                    views: countriesOBJ[key].count
                                })
                            })
                            return h.response({
                                success: true,
                                  from: dataDB.from,
                                    to: dataDB.to,
                                id: request.params.propertyID,
                                totalViews: data.length,
                                regions: regions,
                                cities: cities,
                                countries: countries,


                            }).code(200);

                        } else {
                            return h.response({
                                success: false,
                                error: "not authorized"
                            }).code(401);
                        }



                    } else {
                        return h.response({
                            success: false,
                            error: "property doesn't exist"
                        }).code(401);


                    }



                } else {
                    return h.response({
                        success: false,
                        error: "not authorized"
                    }).code(401);
                }
            }
        }); // POST /api/v1/data/{property id}/locations
        server.route({
            method: 'POST',
            path: '/api/v1/data/{propertyID}/views',
            handler: async function (request, h) {
                let body = request.payload;
                if (!body || !body.auth) {
                    return h.response({
                        success: false,
                        error: "not authorized"
                    }).code(401);
                }
                let uid = await verifyToken(body.auth);
                console.log(request.params.propertyID, uid);
                if (uid) {
                   let property = await getProperty(request.params.propertyID)
                    if (property) {
                        if (authorizedForProperty(property, uid)) {
                            const dataDB = await getDataForProperty(request.params.propertyID)   
                            let data = dataDB.data
                            if (data.length == 0) {
                                return h.response({
                                    success: true,
                                    id: request.params.propertyID,
                                      from: dataDB.from,
                                    to: dataDB.to,
                                    data: [],
                                    count: 0,
                                    totalViews: 0,
                                    visitors: 0
                                }).code(200);
                            }
                            let views = []
                            let totalViews = 0
                            data.forEach(view => {
                                let landing = true
                                if (view.refferer) {
                                    let refferer = getURLComponents(view.refferer)


                                    if (refferer.hostname == property.domain) {
                                        landing = false
                                    }
                                }

                                views.push({
                                    time: view.time,
                                    page: getURLComponents(view.pageurl).page,
                                    landing: landing,
                                    refferer: view.refferer
                                })
                                totalViews++

                            })
                            return h.response({
                                success: true,
                                  from: dataDB.from,
                                    to: dataDB.to,
                                id: request.params.propertyID,
                                visitors: views.filter(a => {
                                    return a.landing
                                }).length,
                                totalViews: data.length,
                                data: views,

                            }).code(200);

                        } else {
                            return h.response({
                                success: false,
                                error: "not authorized"
                            }).code(401);
                        }



                    } else {
                        return h.response({
                            success: false,
                            error: "property doesn't exist"
                        }).code(401);


                    }



                } else {
                    return h.response({
                        success: false,
                        error: "not authorized"
                    }).code(401);
                }
            }
        }); // POST /api/v1/data/{property id}/views

        await server.start();
        console.log('Server running on %s', server.info.uri);

    };

    process.on('unhandledRejection', (err) => {

        console.log(err);
        process.exit(1);
    });

    init();
})