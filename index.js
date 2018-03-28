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
	file[listName].forEach(handler);
}

function updateOutputItem(listName, data, next, nextDataKeys) {
	var file = JSON.parse(readFile(`./output.json`));
	file[listName] = file[listName] || [];
	if (file[listName].filter(d => d.link == data.link).length > 0) {
		file[listName].forEach((d, i) => {
			if (d.link == data.link) {
				for (var x in data) {
					if(d[x]!=='' && data[x]===''){
						//
					}else{
						d[x] = data[x];	
					}
					
				}
			}
		});
	} else {
		file[listName].push(data);
	}
	sander.writeFileSync('./output.json', JSON.stringify(file, null, 2));
	console.log('updateOutputItem', data);

	if (next) {
		let nextData = {};
		if (nextDataKeys === undefined) {
			nextData = data;
		} else {
			nextDataKeys.forEach(k => nextData[k] = data[k]);
		}
		next(nextData);
	}

}

function getSelectorInnerHtmlFromRawHTML(raw, selector) {
	try {
		return cheerio.load(raw).root().find(selector).html();
	} catch (err) {
		return '';
	}
}

function getMergedLists(json, lists, keys){
	var res = [];
	lists.forEach(name => {
		let data = json[name]|| [];
		if (keys) {
			data = data.map(d => {
				let o = {};
				for (var x in keys) {
					o[keys[x]] = d[keys[x]];
				}
				return o;
			});
		}
		console.log('Mergin list',name,'with',data.length,'records');
		res = res.concat(data);
	});
	console.log('Merge res',res.length);
	return res;
}

function createSocketEventsHandlers(socket) {
	return {
		progressBarUpdate: (step, max) => {
			progressBar.update(step);
			socket.emit('result:step', step + '/' + max);
		},
		downloadOutputListCSV: (name, listName, keys, delimiter) => {
			let data = JSON.parse(readFile(`./output.json`));
			if (listName === '*'){
				data = getMergedLists(data, Object.keys(data), keys);
			}else{
				data = getMergedLists(data, [listName], keys);
			}
			socket.emit('downloadCSV', {
				name,
				data: data,
				delimiter
			});
			console.log('downloadCSV emit to client', (data).length, 'records');
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

function firstArrayValue(arr, defaultValue) {
	return (arr.length > 0 && arr[0]) || (defaultValue || '');
}

function isPhone(str) {
	var patt = new RegExp(/^\+?1?\s*?\(?\d{3}(?:\)|[-|\s])?\s*?\d{3}[-|\s]?\d{4}$/);
	return patt.test(str);
}

function isEmail(email) {
	var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
	return re.test(String(email).toLowerCase());
}

function isTelegram(str){
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
	return raw.replace(new RegExp('<br>', 'g'), ' ').replace(new RegExp('</p>', 'g'), ' ').replace(new RegExp('<', 'g'), ' ').split(' ');
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
	console.log('\n\ngetHtmlFromPage exec')
	shell.exec('chmod +x ' + shPath);
	var r = shell.exec(`sh ${shPath}`, {
		silent: false,
		verbose: true
	});
	console.log('\n\ngetHtmlFromPage end')
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