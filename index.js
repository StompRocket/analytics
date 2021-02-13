'use strict';
const Hapi = require('@hapi/hapi');
const Path = require('path');
const fetch = require('node-fetch');
const keys = require('./private/keys.json')
var uaParser = require('ua-parser-js');
const MongoClient = require('mongodb').MongoClient;
const uri = `mongodb+srv://app:${keys.mongo.pass}@cluster0.zejsy.mongodb.net/analyticsDB?retryWrites=true&w=majority`;


 function logView(view)  {
  const client = new MongoClient(uri, { useNewUrlParser: true });
  client.connect(async err => {
    const DBviews = client.db("analyticsDB").collection("views");
   await DBviews.insertOne(view)
    client.close();
});
}
  // perform actions on the collection object
  const init = async () => {

    const server = Hapi.server({
        port: 3056,
        host: 'localhost',
        routes: {
            files: {
                relativeTo: Path.join(__dirname, 'public')
            }
        }
    });
    await server.register(require('@hapi/inert'));
    server.route({
        method: 'GET',
        path: '/',
        handler: function(request, h) {

            return h.file('testpage.html');
        }
    });
    server.route({
        method: 'GET',
        path: '/test',
        handler: function(request, h) {

            return h.file('testpage.html');
        }
    });
    server.route({
        method: 'GET',
        path: '/script',
        handler: function(request, h) {

            return h.file('script.js');
        }
    });

    server.route({
        method: 'POST',
        path: '/api/view',
        handler: (request, h) => {
            //console.log("info")
           // console.log(request.info)
            //console.log("headers")
           // console.log(request.headers)
            const xFF = request.headers['x-forwarded-for']
            const ip = xFF ? xFF.split(',')[0] : request.info.remoteAddress
            const clientData = request.payload.split(',')
            let uaData = uaParser(request.headers["user-agent"])
            fetch('http://ipwhois.app/json/' + ip)
            .then(res => res.json())
            .then(json => {
              console.log(json["completed_requests"], request.info.host)
              const data = {
                propertyID: "propertyID",
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
            }
            console.log(data)
            logView(data)
            });
          

            return true
        }
    });

    await server.start();
    console.log('Server running on %s', server.info.uri);
};

process.on('unhandledRejection', (err) => {

    console.log(err);
    process.exit(1);
});

init();
