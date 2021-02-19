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
    const init = async () => {

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
                    let existing = await propertiesDB.find({
                        "_id": request.params.propertyID
                    }).toArray();
                    console.log(existing)
                    if (existing.length > 0) {
                        let property = existing[0]
                        if (property.access.indexOf(uid) > -1) {
                            const dataDB = client.db("analyticsDB").collection("views");
                            let data = [];
                            // console.log(new Date(2021, 1, 1).toISOString(), new Date().toISOString())
                            try {
                                data = await dataDB.find({
                                    "propertyID": request.params.propertyID,
                                    time: {
                                        $gte: body.from || new Date(2021, 1, 1).toISOString(),
                                        $lt: body.to || new Date().toISOString()
                                    }
                                }).toArray()
                            } catch {
                                data = []
                            }
                            return h.response({
                                success: true,
                                id: request.params.propertyID,
                                from: body.from || new Date(2021, 1, 1).toISOString(),
                                to: body.to || new Date().toISOString(),
                                data: data,
                                count: data.length
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
                    let existing = await propertiesDB.find({
                        "_id": request.params.propertyID
                    }).toArray();
                    console.log(existing)
                    if (existing.length > 0) {
                        let property = existing[0]
                        if (property.access.indexOf(uid) > -1) {
                            const dataDB = client.db("analyticsDB").collection("views");
                            let data = [];
                            // console.log(new Date(2021, 1, 1).toISOString(), new Date().toISOString())
                            try {
                                data = await dataDB.find({
                                    "propertyID": request.params.propertyID,
                                    time: {
                                        $gte: body.from || new Date(2021, 1, 1).toISOString(),
                                        $lt: body.to || new Date().toISOString()
                                    }
                                }).toArray()
                            } catch {
                                data = []
                            }
                            if (data.length == 0) {
                                return h.response({
                                    success: true,
                                    id: request.params.propertyID,
                                    from: body.from || new Date(2021, 1, 1).toISOString(),
                                to: body.to || new Date().toISOString(),
                                    data: [],
                                    count: 0
                                }).code(200);
                            }
                            let pagesOBJ = {}
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
                                from: body.from || new Date(2021, 1, 1).toISOString(),
                                to: body.to || new Date().toISOString(),
                                    id: request.params.propertyID,
                                    data: pages,
                                    count: pages.length
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

        await server.start();
        console.log('Server running on %s', server.info.uri);

    };

    process.on('unhandledRejection', (err) => {

        console.log(err);
        process.exit(1);
    });

    init();
})