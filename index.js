'use strict';
const Hapi = require('@hapi/hapi');
const Path = require('path');
const moment = require('moment')
const fetch = require('node-fetch');
const keys = require('./private/keys.json')
const uaParser = require('ua-parser-js');
const dataProcessors = require("./dataProcessors.js")
const apis = require("./apis.js")
const helpers = require("./helpers.js")
const MongoClient = require('mongodb').MongoClient;
const uri = `mongodb+srv://app:${keys.mongo.pass}@cluster0.zejsy.mongodb.net/analyticsDB?retryWrites=true&w=majority`;
const async = require("async")
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
    
    function filterStringForArray(string, array) {
      let result = true
      
      array.forEach(a => {
        if (string.toLowerCase().indexOf(a.toLowerCase()) > -1) {
          result = false
        }
        //console.log(result, string)
      })
     
      //console.log(t1 - t0, 'milliseconds');
      return result
    }
    async function getDataForProperty(propertyID, from, to) {
      let opID = uuid.v4()
      console.time(`get data (${opID})`);
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
        let origional = data.length
        
        console.time(`bot cleaner (${opID})`);
        data = data.filter((a) => {
         return filterStringForArray(a.userAgent, ["Webflow", "Googlebot", "Mediapartners-Google", "AdsBot-Google", "Bingbot", "Slurp", "DuckDuckBot", "Baiduspider", "YandexBot", "facebot", "facebookexternalhit", "ia_archiver"])
        })
        console.timeEnd(`bot cleaner (${opID})`);
        console.timeEnd(`get data (${opID})`)
        console.log(origional - data.length, "bots")
        return {
            data: data,
            from: start,
            to: end
        }
    }
    async function getProperty(propertyID) {
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
    
    function authorizedForProperty(property, uid, apiKey) {
        //   console.log(uid, apiKey, "authorizing")
        if (property.access.indexOf(uid) > -1) {
            return true
        } else if (property.apiKey == apiKey) {
            return true
        }
        console.log("not authorized", property["_id"], uid, apiKey)
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
            //console.log(uid, decodedToken);
            let res = await client.db("analyticsDB").collection("users").replaceOne({
                _id: uid
            }, {
                _id: uid,
                email: decodedToken.email,
                lastSeen: new Date().toISOString()
            }, {
                upsert: true
            })
            //   console.log(res)
            return uid;
        } catch {
            console.log("token wrong");
            return false;
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
            method: 'GET',
            path: '/api/v1/ip',
             handler: async function (request, h) {
                 
                 const xFF = request.headers['x-forwarded-for'];
                 const ip = xFF ? xFF.split(',')[0] : request.info.remoteAddress;
   //              const clientData = request.payload.split(',');
                 let uaData = uaParser(request.headers["user-agent"]);
               //  let urlComponents = helpers.getURLComponents(clientData[0])
                // console.log(urlComponents)
               
                    
                    let location = await apis.getLocationFromIPCache(ip)
            
                
                      //   console.log();
                         const data = {
                             ip: ip,
                            
                             
                            location,
                            host: request.info.host,
                            
                             browser: {
                                 name: uaData.browser.name,
                                 version: uaData.browser.version,
                                 os: uaData.os.name,
                             },
                             userAgent: request.headers["user-agent"],
                         };
                         //console.log(data);
                        
                        
                 return data;
                    
              
              
             }
        }); // /ip
        server.route({
            method: 'POST',
            path: '/api/v1/view',
            handler: async (request, h) => {
                const xFF = request.headers['x-forwarded-for'];
                const ip = xFF ? xFF.split(',')[0] : request.info.remoteAddress;
                const clientData = request.payload.split(',');
                let uaData = uaParser(request.headers["user-agent"]);
                let urlComponents = helpers.getURLComponents(clientData[0])
                console.log(urlComponents)
                let existing = await propertiesDB.find({
                    domain: urlComponents.hostname
                }).toArray();
                if (existing.length > 0) {
                    //console.log(existing[0].exclude, ip)
                    if (existing[0].exclude && existing[0].exclude.indexOf(ip) > -1) { 
                        console.log("excluded ip")
                       
                    } else {
                    //console.log(existing)
                   let location = await apis.getLocationFromIPCache(ip)
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
                            location,
                            browser: {
                                name: uaData.browser.name,
                                version: uaData.browser.version,
                                os: uaData.os.name,
                            }
                        };
                        console.log(data);
                        logView(data);
                   
                    }
                  
                    
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
                //console.log(body, uid);
                
                if (uid) {
                    
                    
                    let existing = await propertiesDB.find({
                        domain: body.domain
                    }).toArray();
                   // console.log(existing)
                    if (existing.length > 0) {
                        return h.response({
                            success: false,
                            error: "domain in use"
                        }).code(401);
                        
                    } else {
                        let exclude = []
                       // console.log(body.exclude, "exlcude info")
                        if (body.exclude && body.exclude.length > 0) {
                            
                            exclude = body.exclude
                        }
                        
                        const propertiesDB = client.db("analyticsDB").collection("properties");
                        let id = uuid.v4();
                        //console.log(body, body.domain)
                        propertiesDB.insertOne({
                            _id: id,
                            domain: body.domain,
                            owner: uid,
                            access: [uid],
                            exlude: exclude,
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
                if (!body || !body.auth && !body.key) {
                    return h.response({
                        success: false,
                        error: "not authorized"
                    }).code(401);
                }
                let uid = await verifyToken(body.auth);
               // console.log(request.params.propertyID, uid);
                if (uid || body.key) {
                    let property = await getProperty(request.params.propertyID)
                    if (property) {
                        if (authorizedForProperty(property, uid, body.key)) {
                            const result = await getDataForProperty(request.params.propertyID, body.from || null, body.to || null)
                            return h.response({
                                success: true,
                                id: request.params.propertyID,
                                domain: property.domain,
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
                        }).code(404);
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
                if (!body || !body.auth && !body.key) {
                    return h.response({
                        success: false,
                        error: "not authorized"
                    }).code(401);
                }
                let uid = await verifyToken(body.auth);
                //console.log(request.params.propertyID, uid);
                if (uid || body.key) {
                    let property = await getProperty(request.params.propertyID)
                    if (property) {
                        if (authorizedForProperty(property, uid, body.key)) {
                            const dataDB = await getDataForProperty(request.params.propertyID, body.from || null, body.to || null)
                            let data = dataDB.data;
                            
                            
                            let pages = dataProcessors.getPagesFromData(data)
                            return h.response({
                                success: true,
                                from: dataDB.from,
                                to: dataDB.to,
                                id: request.params.propertyID,
                                domain: property.domain,
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
                if (!body || !body.auth && !body.key) {
                    return h.response({
                        success: false,
                        error: "not authorized"
                    }).code(401);
                }
                let uid = await verifyToken(body.auth);
              //  console.log(request.params.propertyID, uid);
                if (uid || body.key) {
                    let property = await getProperty(request.params.propertyID)
                    if (property) {
                        if (authorizedForProperty(property, uid, body.key)) {
                            const dataDB = await getDataForProperty(request.params.propertyID, body.from || null, body.to || null)
                            let data = dataDB.data
                            
                            let result = dataProcessors.getRefferersFromData(data, property.domain)
                            return h.response({
                                success: true,
                                from: dataDB.from,
                                to: dataDB.to,
                                id: request.params.propertyID,
                                domain: property.domain,
                                data: result,
                                count: result.length,
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
                if (!body || !body.auth && !body.key) {
                    return h.response({
                        success: false,
                        error: "not authorized"
                    }).code(401);
                }
                let uid = await verifyToken(body.auth);
               // console.log(request.params.propertyID, uid);
                if (uid || body.key) {
                    let property = await getProperty(request.params.propertyID)
                    if (property) {
                        if (authorizedForProperty(property, uid, body.key)) {
                            const dataDB = await getDataForProperty(request.params.propertyID, body.from || null, body.to || null)
                            let data = dataDB.data
                            let pages = dataProcessors.getBrowsersFromData(data)
                            return h.response({
                                success: true,
                                from: dataDB.from,
                                to: dataDB.to,
                                id: request.params.propertyID,
                                domain: property.domain,
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
            path: '/api/v1/data/{propertyID}/languages',
            handler: async function (request, h) {
                let body = request.payload;
                if (!body || !body.auth && !body.key) {
                    return h.response({
                        success: false,
                        error: "not authorized"
                    }).code(401);
                }
                let uid = await verifyToken(body.auth);
               // console.log(request.params.propertyID, uid);
                if (uid || body.key) {
                    let property = await getProperty(request.params.propertyID)
                    if (property) {
                        if (authorizedForProperty(property, uid, body.key)) {
                            const dataDB = await getDataForProperty(request.params.propertyID, body.from || null, body.to || null)
                            let data = dataDB.data
                            let pages = dataProcessors.getLanguagesFrom(data)
                            return h.response({
                                success: true,
                                from: dataDB.from,
                                to: dataDB.to,
                                id: request.params.propertyID,
                                domain: property.domain,
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
        }); // POST /api/v1/data/{property id}/languages
        server.route({
            method: 'POST',
            path: '/api/v1/data/{propertyID}/os',
            handler: async function (request, h) {
                let body = request.payload;
                if (!body || !body.auth && !body.key) {
                    return h.response({
                        success: false,
                        error: "not authorized"
                    }).code(401);
                }
                let uid = await verifyToken(body.auth);
             //  console.log(request.params.propertyID, uid);
                if (uid || body.key) {
                    let property = await getProperty(request.params.propertyID)
                    if (property) {
                        if (authorizedForProperty(property, uid, body.key)) {
                            const dataDB = await getDataForProperty(request.params.propertyID, body.from || null, body.to || null)
                            let data = dataDB.data
                            let pages = dataProcessors.getOSFromData(data)
                            return h.response({
                                success: true,
                                from: dataDB.from,
                                to: dataDB.to,
                                id: request.params.propertyID,
                                domain: property.domain,
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
                if (!body || !body.auth && !body.key) {
                    return h.response({
                        success: false,
                        error: "not authorized"
                    }).code(401);
                }
                let uid = await verifyToken(body.auth);
              //  console.log(request.params.propertyID, uid);
                if (uid || body.key) {
                    let property = await getProperty(request.params.propertyID)
                    if (property) {
                        if (authorizedForProperty(property, uid, body.key)) {
                            const dataDB = await getDataForProperty(request.params.propertyID, body.from || null, body.to || null)
                            let data = dataDB.data
                            let pages = dataProcessors.getPlatformsFromData(data)
                            return h.response({
                                success: true,
                                from: dataDB.from,
                                to: dataDB.to,
                                id: request.params.propertyID,
                                domain: property.domain,
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
                if (!body || !body.auth && !body.key) {
                    return h.response({
                        success: false,
                        error: "not authorized"
                    }).code(401);
                }
                let uid = await verifyToken(body.auth);
              //  console.log(request.params.propertyID, uid);
                if (uid || body.key) {
                    let property = await getProperty(request.params.propertyID)
                    if (property) {
                        if (authorizedForProperty(property, uid, body.key)) {
                            const dataDB = await getDataForProperty(request.params.propertyID, body.from || null, body.to || null)
                            let data = dataDB.data
                            let pages = dataProcessors.getScreensFromData(data)
                            return h.response({
                                success: true,
                                from: dataDB.from,
                                to: dataDB.to,
                                id: request.params.propertyID,
                                domain: property.domain,
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
                if (!body || !body.auth && !body.key) {
                    return h.response({
                        success: false,
                        error: "not authorized"
                    }).code(401);
                }
                let uid = await verifyToken(body.auth);
                //console.log(request.params.propertyID, uid);
                if (uid || body.key) {
                    let property = await getProperty(request.params.propertyID)
                    if (property) {
                        if (authorizedForProperty(property, uid, body.key)) {
                            const dataDB = await getDataForProperty(request.params.propertyID, body.from || null, body.to || null)
                            let data = dataDB.data
                            let result = dataProcessors.getLocationsFromData(data)
                            return h.response({
                                success: true,
                                from: dataDB.from,
                                to: dataDB.to,
                                id: request.params.propertyID,
                                domain: property.domain,
                                totalViews: data.length,
                                regions: result.regions,
                                cities: result.cities,
                                countries: result.countries,
                                
                                
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
                if (!body || !body.auth && !body.key) {
                    return h.response({
                        success: false,
                        error: "not authorized",
                        description: "not enough data"
                    }).code(401);
                }
                let uid = await verifyToken(body.auth);
              //  console.log(request.params.propertyID, uid);
                if (uid || body.key) {
                    let property = await getProperty(request.params.propertyID)
                    if (property) {
                        if (authorizedForProperty(property, uid, body.key)) {
                            const dataDB = await getDataForProperty(request.params.propertyID, body.from || null, body.to || null)
                            let data = dataDB.data
                            let result = dataProcessors.getViewsFromData(data, property.domain)
                            return h.response({
                                success: true,
                                from: dataDB.from,
                                to: dataDB.to,
                                id: request.params.propertyID,
                                domain: property.domain,
                                visitors: result.visitors,
                                totalViews: data.length,
                                data: result.views,
                                
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
                        error: "not authorized",
                        description: "not enough data"
                    }).code(401);
                }
            }
        }); // POST /api/v1/data/{property id}/views
        server.route({
            method: 'POST',
            path: '/api/v1/user/{uid}/update',
            handler: async function (request, h) {
                let body = request.payload;
                if (!body || !body.auth) {
                    return h.response({
                        success: false,
                        error: "not authorized"
                    }).code(401);
                }
                let uid = await verifyToken(body.auth);
              //  console.log(request.params.uid, uid);
                if (uid && uid == request.params.uid) {
                    
                    return h.response({
                        success: true,
                        
                        
                    }).code(200);
                    
                    
                } else {
                    return h.response({
                        success: false,
                        error: "not authorized"
                    }).code(401);
                }
            }
        }); // POST /api/v1/user/{uid}/update
        server.route({
            method: 'POST',
            path: '/api/v1/user/{uid}/properties',
            handler: async function (request, h) {
                let body = request.payload;
                if (!body || !body.auth) {
                    return h.response({
                        success: false,
                        error: "not authorized"
                    }).code(401);
                }
                let uid = await verifyToken(body.auth);
               // console.log(request.params.uid, uid);
                if (uid && uid == request.params.uid) {
                    let data = await client.db("analyticsDB").collection("properties").find({
                        access: uid
                    }).toArray()
                   
                     let result = []
                let oneWeekAgo = moment().subtract(7, "days").toISOString()
                    for (const a of data) { 
                        let dataDB = await getDataForProperty(a["_id"], oneWeekAgo)
                        let data = dataDB.data
                       // console.log(data.length, a["_id"])
                        let views = dataProcessors.getViewsFromData(data, a.domain)
                         a.stats = views
                        result.push(a)
                    }
                   
                    //console.log(result, "result")
                    return h.response({
                        success: true,
                        data: result
                        
                    }).code(200);
                    
                    
                    
                    
                    
                    
                    
                    
                } else {
                    return h.response({
                        success: false,
                        error: "not authorized"
                    }).code(401);
                }
            }
        }); // POST /api/v1/user/{uid}/properties
        await server.start();
        console.log('Server running on %s', server.info.uri);
        
    };
    
    process.on('unhandledRejection', (err) => {
        
        console.log(err);
        process.exit(1);
    });
    
    init();
})
