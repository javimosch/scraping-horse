const errorToJSON = require('error-to-json')
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
	cwdFile
} = require('./helpers');

const {
	getHtmlFromPage
} = require('./phantom');
const {
	getSocketActions
} = require('./socket');



module.exports = {
	updateOutputItem,
	runScraper,
	scrapeCountryCodes,
	scrapeLocalbitcoinsPageLinks,
	parseLocalbitcoinsPageLinksRawData
}

const outputJsonPath = cwdFile('output.json');

function updateOutputItem(listName, data, next, nextDataKeys, showLog) {
	var file = JSON.parse(readFile(outputJsonPath));
	file[listName] = file[listName] || [];
	if (file[listName].filter(d => d.link == data.link).length > 0) {
		file[listName].forEach((d, i) => {
			if (d.link == data.link) {
				for (var x in data) {

					if (d[x] !== '' && data[x] === '') {
						//
					} else {
						d[x] = data[x];
					}


				}
			}
		});
	} else {
		file[listName].push(data);
	}
	sander.writeFileSync(outputJsonPath, JSON.stringify(file, null, 2));
	if (showLog) {
		console.log('Updating', data.link);
	}
	if (next) {
		let nextData = {};
		if (nextDataKeys === undefined) {
			nextData = data;
		} else {
			nextDataKeys.forEach(k => nextData[k] = data[k]);
		}
		if (nextData.email || nextData.phone || nextData.telegram) {
			next(nextData);
		}
	}

}

function runScraper(jsCode, socket,io) {
	const {
		progressBarUpdate,
		downloadOutputListCSV
	} = getSocketActions(socket, {
		getMergedLists,
		progressBar,
		readFile,
		io
	});

	(async () => {

		return await evalInContext(`${jsCode}`, {
			cheerio,
			sequential,
			fse,
			progressBar,
			_,
			getHtmlFromPage,
			readFile,
			readFileAndSplitLines,
			filterNoResolved,
			updateOutputItem,
			getSelectorInnerHtmlFromRawHTML,
			progressBarUpdate,
			forEachOutputItem,
			firstArrayValue,
			splitWords,
			isEmail,
			isPhone,
			downloadOutputListCSV,
			isTelegram,
			$,
			io
		});
	})().then(res => {
		socket.emit('result:then', res);
	}).catch(err => {
		socket.emit('result:catch', {
			err: errorToJSON(err)
		});
	});
}



function parseLocalbitcoinsPageLinksRawData() {
	try {
		json = JSON.parse(readFile(cwdFile(`outputLocalbitcoinsScrapeLinks.json`)));
	} catch (err) {
		return;
	}
	let rta = [];
	Object.keys(json).map(k => ({
		url: k,
		raw: json[k].raw
	})).forEach(item => {
		if (!item.raw) return;
		let res = $(item.raw).find('a').map(function() {
			return $(this).attr('href');
		}).toArray().filter(href => href.indexOf('accounts/profile') !== -1)
		rta = rta.concat(res);
		//console.log('Collecting accounts from ',item.url);
	});
	rta = _.uniq(rta);
	rta = rta.map(url => `https://localbitcoins.com${url}`);

	let original = readFileAndSplitLines(`localBitcoin_original.txt`);
	console.log('localbitcoins: Original links', original.length);
	console.log('localbitcoins: Original links without duplication', _.uniq(original).length);

	console.log('localbitcoins: New links', rta.length);
	rta = _.uniq(readFileAndSplitLines(`localBitcoin.txt`).concat(rta));
	console.log('localbitcoins: Total links', rta.length);

	sander.writeFileSync(cwdFile('localBitcoin.txt'), rta.join('\n'));
}



async function scrapeLocalbitcoinsPageLinks() {
	let countryCodes = await scrapeCountryCodes();
	var json;
	try {
		json = JSON.parse(readFile(cwdFile(`outputLocalbitcoinsScrapeLinks.json`)));
	} catch (err) {
		json = {};
	}
	//_.take(countryCodes,10)
	countryCodes.forEach(({
		name,
		code
	}) => {
		//if(!code) return;
		for (var x = 1; x <= 10; x++) {
			let qs = x >= 2 ? '?page=' + x : '';

			let url = `https://localbitcoins.com/es/comprar-bitcoins-online/${code.trim()}/${name.trim()}/${qs}`;
			//if(json[url] && json[url].scraped) return;
			console.log('Scraping', url);
			let html = getHtmlFromPage(url, '.table-bitcoins', 2000, 3000);
			if (!html && x >= 2) return;
			json[url] = {
				raw: html,
				scraped: true
			};
			sander.writeFileSync(cwdFile('outputLocalbitcoinsScrapeLinks.json'), JSON.stringify(json, null, 2));

		}



	});
}

async function scrapeCountryCodes() {
	var json;
	try {
		json = JSON.parse(readFile(cwdFile(`countryCodes.json`)));
		return Object.keys(json).map(k => ({
			name: k,
			code: json[k]
		}));
	} catch (err) {
		json = {};
	}
	let res = await axios.get('http://www.nationsonline.org/oneworld/country_code_list.htm')
	let rta = cheerio.load(res.data).root().find('body #codelist tbody tr');
	rta = rta.map(function() {
		let tds = cheerio(this).html();
		let name = cheerio(cheerio(tds).get(3)).find('a').html();
		let code = cheerio(cheerio(tds).get(3)).next().html()
		if (!name) return null;
		return {
			name: name.toString().toLowerCase(),
			code: code
		}
	}).get().filter(d => d !== null && d.name.indexOf(' ') === -1);
	rta.forEach(c => {
		json[c.name] = c.code
	});
	sander.writeFileSync(cwdFile('countryCodes.json'), JSON.stringify(json, null, 2));
	rta;
}