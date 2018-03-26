var base64 = require('base-64');
var errorToJSON = require('error-to-json')
var Horseman = require('node-horseman');
var horseman = new Horseman();
const cheerio = require('cheerio')
const argv = require('yargs').argv
let decodedCode = JSON.parse(base64.decode(argv.code));
//console.log('Code was ', decodedCode)
try {
	evalInContext(`
  		${decodedCode}
  	`, {
		horseman,
		cheerio
	}).then(res => {
		console.log(JSON.stringify(res));
		process.exit(0);
	}).catch(err => {
		console.log(errorToJSON(err));
		process.exit(1);
		//;
	});
} catch (err) {
	console.log(errorToJSON(err));
	process.exit(1);
}

function evalInContext(js, ctx) {
	//return async function() {
	return new Promise((resolve, reject) => {
		try {
			let evalString = `(async(${Object.keys(ctx).join(',')})=>{
				${js}
			}).apply(this,[${Object.keys(ctx).map(k=>'ctx.'+k).join(',')}]);`;
			let promise = eval(evalString);
			promise.then(resolve);
		} catch (err) {
			reject(err);
		}
	});

	//}.call(ctx);
}