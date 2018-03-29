require('dotenv').config({
    silent: true
});
const express = require('express');
const app = require('express')();
const errorToJSON = require('error-to-json')
const http = require('http').Server(app);
const io = require('socket.io')(http);
const shell = require('shelljs');
const path = require('path');
const base64 = require('base-64');
const sander = require('sander');
const shortid = require('shortid');
const rimraf = require('rimraf');
const fs = require('fs');
const jsonexport = require('jsonexport/dist');
const axios = require('axios');
const cheerio = require('cheerio')
const sequential = require('promise-sequential');
const fse = require('fs-extra')
const cliProgress = require('cli-progress');
const progressBar = new cliProgress.Bar({}, cliProgress.Presets.shades_classic);
const _ = require('lodash');
const jsdom = require('jsdom');
const {
    JSDOM
} = jsdom;
const {
    window
} = new JSDOM('<html></html>');
const $ = require('jquery')(window);
const db = require('./db');

const {
    firstArrayValue,
    isPhone,
    isEmail,
    isTelegram,
    evalInContext,
    isParsable,
    splitWords,
    compileTemplate,
    getMergedLists,
    readFile,
    readFileAndSplitLines,
    getSelectorInnerHtmlFromRawHTML,
    forEachOutputItem,
    filterNoResolved,
    readFileFromCwdAsync,
    isDevelopment
} = require('./helpers');

const {
    getHtmlFromPage
} = require('./phantom');

const {
    getSocketActions
} = require('./socket');

const {
    updateOutputItem,
    runScraper,
    scrapeCountryCodes,
    scrapeLocalbitcoinsPageLinks,
    parseLocalbitcoinsPageLinksRawData
} = require('./scraperHelper');

init();

function init() {
    configure();
}

function configure() {
    cleanProject();
    //db.connect().then(() => {
        compileClientBundle();
        setExpressRoutes();
        configureSockets();
        startServer();
    //}).catch(err => {
        //console.log(err);
        //process.exit(1);
    //});
}

function compileClientBundle() {
    let srcFile = path.join(process.cwd(), 'src/client/main.js');
    let destFile = path.join(process.cwd(), 'public/bundle.js');
    var r = shell.exec(`npx browserify ${srcFile} -o ${destFile}`);
    console.log(r.code === 0 ? 'Bundle generated' : 'Bundle error');
}

function configureSockets() {
    io.on('connection', async function(socket) {
        console.log('Client connected');

        //let Scripts = db.connections.main.model('scripts');
        if (isDevelopment) {
            //await Scripts.remove({}).exec();
        }
        //Scripts.findOne({}).then(async doc => {
            //if (!doc || !doc.code) {
                let code = await readFileFromCwdAsync('src/client/defaultEditorScript.js');
                /*if (!code) throw new Error('Code should exists');
                doc = await Scripts.create({
                    code: code
                });
            } else {}*/
            //socket.emit('script:fetch:then', doc.code);
            socket.emit('script:fetch:then', code);
        //}).catch(err => {
          //  throw err;
            //socket.emit('script:fetch:catch', err)
        //});

        socket.on('runScraper', function(params) {
            runScraper(params.js, socket, io);
        });
    });
}

function startServer() {
    http.listen(process.env.PORT || 3000, function() {
        console.log('listening on', process.env.PORT || 3000);
    });
}

function setExpressRoutes() {
    app.use('/', express.static(path.join(process.cwd(), '/public')));
}

function cleanProject() {
    rimraf.sync('./temp/*.js');
    rimraf.sync('./*.sh');
}