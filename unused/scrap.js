var base64 = require('base-64');
var errorToJSON = require('error-to-json')
var Horseman = require('node-horseman');
var horseman = new Horseman();
const cheerio = require('cheerio')
const argv = require('yargs').argv
let decodedCode = JSON.parse(base64.decode(argv.code));
const sequential = require('promise-sequential');
const fse = require('fs-extra')
const cliProgress = require('cli-progress');
const progressBar = new cliProgress.Bar({}, cliProgress.Presets.shades_classic);
const _ = require('lodash');
//var casper = require('casper').create();
var casper = {};
const phantom = require('phantom');
try {
	evalInContext(`
  		${decodedCode}
  	`, {
		horseman,
		cheerio,
		sequential,
		fse,
		progressBar,
		_,
		casper,
		phantom
	}).then(res => {
		//console.log(JSON.stringify(res));
		process.exit(0);
	}).catch(err => {
		console.log('SCRAP ERROR:',err.stack?errorToJSON(err):JSON.stringify(err,null,2));
		process.exit(1);
		//;
	});
} catch (err) {
	console.log('SCRAP ERROR:',err.stack?errorToJSON(err):JSON.stringify(err,null,2));
	process.exit(1);
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