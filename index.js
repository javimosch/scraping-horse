var express = require('express');
var app = require('express')();
var errorToJSON = require('error-to-json')
var http = require('http').Server(app);
var io = require('socket.io')(http);
var shell = require('shelljs');
var path = require('path');
var base64 = require('base-64');
var sander = require('sander');
var shortid = require('shortid');
var rimraf = require('rimraf');
var fs = require('fs');
var jsonexport = require('jsonexport/dist');
var axios = require('axios');

const cheerio = require('cheerio')
const sequential = require('promise-sequential');
const fse = require('fs-extra')
const cliProgress = require('cli-progress');
const progressBar = new cliProgress.Bar({}, cliProgress.Presets.shades_classic);
const _ = require('lodash');

var r = shell.exec('npx browserify main.js -o bundle.js');
console.log(r.code, r.stderr, r.stdout, r.code === 0 ? 'Bundle generated' : 'Bundle error');

rimraf.sync('./temp/*.js');
rimraf.sync('./*.sh');

var jsdom = require('jsdom');
const { JSDOM } = jsdom;
const { window } = new JSDOM('<html></html>');
var $ = require('jquery')(window);

//scrapeLocalbitcoinsPageLinks();
parseLocalbitcoinsPageLinksRawData();

app.get('/', function(req, res) {
	res.sendFile(__dirname + '/index.html');
});

app.get('/', function(req, res) {
	res.sendFile(__dirname + '/index.html');
});

app.use(express.static(__dirname + '/'));

io.on('connection', function(socket) {
	console.log('Client connected');
	socket.on('runScraper', function(params) {
		runScraper(params.js, socket);
	});
});

http.listen(process.env.PORT || 3000, function() {
	console.log('listening on', process.env.PORT || 3000);
});



function parseLocalbitcoinsPageLinksRawData(){
	try{
		json = JSON.parse(readFile(`./outputLocalbitcoinsScrapeLinks.json`));
	}catch(err){
		return;
	}
	let rta = [];
	Object.keys(json).map(k=>({
		url:k,
		raw:json[k].raw
	})).forEach(item=>{
		if(!item.raw) return;
		let res = $(item.raw).find('a').map(function(){
			return $(this).attr('href');
		}).toArray().filter(href=>href.indexOf('accounts/profile')!==-1)
		rta = rta.concat(res);
		//console.log('Collecting accounts from ',item.url);
	});
	rta = _.uniq(rta);
	rta = rta.map(url=>`https://localbitcoins.com${url}`);
	
	let original = _.uniq(readFileAndSplitLines(`./localBitcoin_original.txt`).concat(rta));
	console.log('localbitcoins: Original links', original.length);
	console.log('localbitcoins: Original links without duplication', _.uniq(original).length);

	console.log('localbitcoins: New links', rta.length);
	rta = _.uniq(readFileAndSplitLines(`./localBitcoin.txt`).concat(rta));
	console.log('localbitcoins: Total links', rta.length);

	sander.writeFileSync('./localBitcoin.txt', rta.join('\n'));
}

async function scrapeLocalbitcoinsPageLinks() {
	let countryCodes = await scrapeCountryCodes();
	var json;
	try{
		json = JSON.parse(readFile(`./outputLocalbitcoinsScrapeLinks.json`));
	}catch(err){
		json = {};
	}
	//_.take(countryCodes,10)
	countryCodes.forEach(({name, code})=>{
		//if(!code) return;
		for(var x=1;x<=10;x++){
			let qs = x>=2 ? '?page='+x : '';

			let url = `https://localbitcoins.com/es/comprar-bitcoins-online/${code.trim()}/${name.trim()}/${qs}`;
			//if(json[url] && json[url].scraped) return;
			console.log('Scraping',url);
			let html = getHtmlFromPage(url, '.table-bitcoins', 2000, 3000);
			if(!html && x>=2) return;
			json[url]={
				raw:html,
				scraped:true
			};
			sander.writeFileSync('./outputLocalbitcoinsScrapeLinks.json', JSON.stringify(json, null, 2));

		}

		
		
	});
}

async function scrapeCountryCodes() {
	var json;
	try{
		json = JSON.parse(readFile(`./countryCodes.json`));
		return Object.keys(json).map(k=>({
			name:k,
			code: json[k]
		}));
	}catch(err){
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
	rta.forEach(c=>{
		json[c.name]=c.code
	});
	sander.writeFileSync('./countryCodes.json', JSON.stringify(json, null, 2));
	rta;
}

function runScraperProcess() {
	//let encodedCode = base64.encode(JSON.stringify(params.js));
	//r = shell.exec(`node ${path.join(process.cwd(),'scrap.js')} --code="${encodedCode}"`, {silent: false});
}

function readFile(n) {
	return sander.readFileSync('./' + n).toString('utf-8');
}

function readFileAndSplitLines(n) {
	return readFile(n).split('\n');
}

var outputList = null;

function filterNoResolved(arr, listName, ignore) {
	//if (!outputList) {
	outputList = JSON.parse(readFile(`./output.json`));
	//}
	return arr.filter(link => {
		if (ignore !== undefined && ignore === true) return true;
		return outputList[listName].filter(item => item.link == link && item.resolved === true).length == 0
	});
}

function forEachOutputItem(listName, handler) {
	var file = JSON.parse(readFile(`./output.json`));
	file[listName] = file[listName] || [];
	console.log('forEachOutputItem START',file[listName].length);
	file[listName].forEach(handler);
	console.log('forEachOutputItem END');
}

function updateOutputItem(listName, data, next, nextDataKeys) {
	var file = JSON.parse(readFile(`./output.json`));
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

					//if(x==='email' && !d[x]) d[x] = '';
					//if(x==='phone' && !d[x]) d[x] = '';
					//if(x==='telegram' && !d[x]) d[x] = '';

				}
			}
		});
	} else {
		file[listName].push(data);
	}
	sander.writeFileSync('./output.json', JSON.stringify(file, null, 2));
	console.log('Updating', data.link);
	if (next) {
		let nextData = {};
		if (nextDataKeys === undefined) {
			nextData = data;
		} else {
			nextDataKeys.forEach(k => nextData[k] = data[k]);
		}
		if(nextData.email ||nextData.phone||nextData.telegram){
			next(nextData);
		}
	}

}

function getSelectorInnerHtmlFromRawHTML(raw, selector) {
	try {
		return cheerio.load(raw).root().find(selector).html();
	} catch (err) {
		return '';
	}
}

function getMergedLists(json, lists, keys) {
	var res = [];
	lists.forEach(name => {
		let data = json[name] || [];
		if (keys) {
			data = data.map(d => {
				let o = {};
				for (var x in keys) {
					o[keys[x]] = d[keys[x]];
				}
				return o;
			});
		}
		console.log('Mergin list', name, 'with', data.length, 'records');
		res = res.concat(data);
	});
	console.log('Merge res', res.length);
	return res;
}

function createSocketEventsHandlers(socket) {
	return {
		progressBarUpdate: (step, max) => {
			progressBar.update(step);
			io.emit('result:step', step + '/' + max);
		},
		downloadOutputListCSV: (enabled, name, listName, keys, delimiter, conditionKeys) => {
			let data = JSON.parse(readFile(`./output.json`));
			if (listName === '*') {
				data = getMergedLists(data, Object.keys(data), keys);
			} else {
				data = getMergedLists(data, [listName], keys);
			}
			if(conditionKeys!==undefined){
				data = data.filter(d=>{
					for(var x in conditionKeys){
						if(!d[conditionKeys[x]]) return false;
					}
					return true;
				});
			}else{
				data = data.filter(d=>{
					if(!d.email && !d.phone && !d.telegram) return false;
					return true;
				});
			}
			if(!enabled){
				return data.length;
			}
			socket.emit('downloadCSV', {
				name,
				data: data,
				delimiter
			});
			console.log('downloadCSV emit to client', (data).length, 'records');
			return data.length;
		}
	}
}

function runScraper(jsCode, socket) {
	//let html = getHtmlFromPage("https://localethereum.com/es/profile/yeissone", 'main h1 + div table + h2 + div', 4000, 10000);
	//if (html !== '') {

	const {
		progressBarUpdate,
		downloadOutputListCSV
	} = createSocketEventsHandlers(socket);

	(async () => {
		//return await fse.readJson(`./output.json`)
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
			isTelegram
		});
	})().then(res => {
		socket.emit('result:then', res);
	}).catch(err => {
		socket.emit('result:catch', {
			err: errorToJSON(err)
		});
	});
	//} else {
	//	console.log('ERROR', 'Unable to fetch content from web page (Check log.txt).');
	//	socket.emit('result:catch', new Error('Unable to fetch content from url'));
	//}
}

function firstArrayValue(arr, transformHandler,defaultValue) {
	if(arr.length > 0) {
		let v = arr[0] || defaultValue || '';
		if(transformHandler){
			return transformHandler(v);
		}else{
			return v || defaultValue || '';	
		}
	}else{
		return defaultValue || '';
	}
}

function isPhone(str) {
	var re1 = new RegExp(/^\+?1?\s*?\(?\d{3}(?:\)|[-|\s])?\s*?\d{3}[-|\s]?\d{4}$/);
	let re2 = new RegExp(/^(\+\d{1,3}[- ]?)?\d{10}$/);
	let re3 = new RegExp(/^(\+?\d{1,4}[\s-])?(?!0+\s+,?$)\d{10}\s*,?$/);
	let re4 = new RegExp(/^(?:\+?88)?01[15-9]\d{8}$/);
	let isNumberWithLenGte = (d)=>!isNaN(str) && str.length > d;
	return re1.test(str)||re2.test(str)||re3.test(str)||re4.test(str)||isNumberWithLenGte(6);
}

function isEmail(email) {
	var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
	return re.test(String(email).toLowerCase());
}

function isTelegram(str) {
	return new RegExp(/@([A-z]|[0-9]){6,32}$/).test(str);
}

function evalInContext(js, ctx) {
	return new Promise((resolve, reject) => {
		try {
			let evalString = `(async(${Object.keys(ctx).join(',')})=>{
				${js}
				return await script();
			}).apply(this,[${Object.keys(ctx).map(k=>'ctx.'+k).join(',')}]);`;
			let promise = eval(evalString);
			promise.then(resolve).catch(reject);
		} catch (err) {
			reject(err);
		}
	});
}

function isParsable(code) {
	try {
		JSON.parse(code);
		return true;
	} catch (err) {
		return false;
	}
}

function splitWords(raw) {
	return raw
		.replace(new RegExp('<br>', 'g'), ' ')
		.replace(new RegExp('</p>', 'g'), ' ')
		.replace(new RegExp('<', 'g'), ' ')
		.replace(new RegExp('=', 'g'), ' ')
		.replace(new RegExp('/', 'g'), ' ')
		.replace(new RegExp('\n', 'g'), ' ')
		.replace(new RegExp(':', 'g'), ' ')
		//.replace(new RegExp('.', 'g'), ' ')
		//.replace(new RegExp('&', 'g'), ' ')
		//.replace(new RegExp('(', 'g'), '')
		//.replace(new RegExp(')', 'g'), '')
		.trim().split(' ').map(w => w.trim());
}

function compileTemplate(src, obj) {
	Object.keys(obj).forEach(k => {
		src = src.replace(new RegExp('__' + k.toUpperCase() + '__', 'g'), obj[k]);
	});
	return src;
}

function getHtmlFromPage(url, selector, waitAtLeast, timeoutAt) {
	if (!url) throw new Error('url required');
	let template = sander.readFileSync('./slimerTemplate.js').toString('utf-8');
	let jsFileName = shortid.generate() + '.js';
	let filePath = './temp/' + jsFileName;
	let shPath = './' + shortid.generate() + '.sh';
	sander.writeFileSync(filePath, compileTemplate(template, {
		url: url,
		selector: selector || 'body',
		wait: waitAtLeast || 4000,
		timeout: timeoutAt || 10000
	}));
	sander.writeFileSync(shPath, 'npx slimerjs ' + filePath);
	//console.log('\n\ngetHtmlFromPage exec')
	shell.exec('chmod +x ' + shPath);
	var r = shell.exec(`sh ${shPath}`, {
		silent: true,
		verbose: false
	});
	//console.log('\n\ngetHtmlFromPage end')
	rimraf.sync(filePath);
	rimraf.sync(shPath);
	if (r.code !== 0) {
		//console.log('ERROR', r && r.code, r && r.stdout, r && r.stderr);
		fs.appendFileSync('./log.txt', `CODE ${r.code} STDERR ${r.stderr} STDOUT ${r.stdout}\n  ${url}`);
	} else {
		fs.appendFileSync('./log.success.txt', `CODE ${r.code} STDERR ${r.stderr} STDOUT\n\n${r.stdout}\n\n`);
	}
	return (r.code === 0 && r.stdout) || '';
}