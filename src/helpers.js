const sander = require('sander');
const cheerio = require('cheerio');
const path = require('path');
const tmpDir = path.join(process.cwd(),'tmp');
const cwd = process.cwd();
const isDevelopment = process.env.NODE_ENV !== 'production';

module.exports = {
	isDevelopment,
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
	cwdFile,
	getTmpDir,
	readFileFromCwdAsync
};



function cwdFile(p){
	return path.join(cwd,'files',p);
}
function getTmpDir(){
	return tmpDir
}

function filterNoResolved(arr, listName, ignore) {
	var outputList = JSON.parse(readFile(cwdFile(`output.json`)));
	return arr.filter(link => {
		if (ignore !== undefined && ignore === true) return true;
		return outputList[listName].filter(item => item.link == link && item.resolved === true).length == 0
	});
}

function forEachOutputItem(listName, handler) {
	var file = JSON.parse(readFile(cwdFile(`output.json`)));
	file[listName] = file[listName] || [];
	file[listName].forEach(handler);
}

function getSelectorInnerHtmlFromRawHTML(raw, selector) {
	try {
		return cheerio.load(raw).root().find(selector).html();
	} catch (err) {
		return '';
	}
}

async function readFileFromCwdAsync(p){
	return (await sander.readFileSync(path.join(process.cwd(),p))).toString('utf-8');
}

function readFile(n) {
	return sander.readFileSync(n).toString('utf-8');
}

function readFileAndSplitLines(n) {
	return readFile(cwdFile(n)).split('\n');
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
		res = res.concat(data);
	});
	return res;
}

function firstArrayValue(arr, transformHandler, defaultValue) {
	if (arr.length > 0) {
		let v = arr[0] || defaultValue || '';
		if (transformHandler) {
			return transformHandler(v);
		} else {
			return v || defaultValue || '';
		}
	} else {
		return defaultValue || '';
	}
}

function isPhone(str) {
	var re1 = new RegExp(/^\+?1?\s*?\(?\d{3}(?:\)|[-|\s])?\s*?\d{3}[-|\s]?\d{4}$/);
	let re2 = new RegExp(/^(\+\d{1,3}[- ]?)?\d{10}$/);
	let re3 = new RegExp(/^(\+?\d{1,4}[\s-])?(?!0+\s+,?$)\d{10}\s*,?$/);
	let re4 = new RegExp(/^(?:\+?88)?01[15-9]\d{8}$/);
	let isNumberWithLenGte = (d) => !isNaN(str) && str.length > d;
	return re1.test(str) || re2.test(str) || re3.test(str) || re4.test(str) || isNumberWithLenGte(6);
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
		.replace(new RegExp('<br>', 'g'), '###')
		.replace(new RegExp('</p>', 'g'), '###')
		.replace(new RegExp('<', 'g'), '###')
		.replace(new RegExp('=', 'g'), '###')
		.replace(new RegExp('/', 'g'), '###')
		.replace(new RegExp('\n', 'g'), '###')
		.replace(new RegExp(':', 'g'), '###')
		.replace(new RegExp(';', 'g'), '###')
		.replace(new RegExp(',', 'g'), '###')
		.replace(new RegExp(' ', 'g'), '')
		//.replace(new RegExp('.', 'g'), ' ')
		//.replace(new RegExp('&', 'g'), ' ')
		//.replace(new RegExp('(', 'g'), '')
		//.replace(new RegExp(')', 'g'), '')
		.trim().split('###').map(w => w.trim());
}

function compileTemplate(src, obj) {
	Object.keys(obj).forEach(k => {
		src = src.replace(new RegExp('__' + k.toUpperCase() + '__', 'g'), obj[k]);
	});
	return src;
}