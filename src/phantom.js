const rimraf = require('rimraf');
const fs = require('fs');
const shell = require('shelljs');
const sander = require('sander');
const shortid = require('shortid');
const path = require('path');

const {
	compileTemplate,
	cwdFile,
	getTmpDir
} = require('./helpers');

module.exports = {
	getHtmlFromPage
};


function getHtmlFromPage(url, selector, waitAtLeast, timeoutAt) {
	if (!url) throw new Error('url required');
	let template = sander.readFileSync(path.join(process.cwd(),'src','slimerTemplate.js')).toString('utf-8');
	let jsFileName = shortid.generate() + '.js';
	let filePath = path.join(getTmpDir(),jsFileName);
	let shPath = path.join(getTmpDir(),shortid.generate() + '.sh');
	sander.writeFileSync(filePath, compileTemplate(template, {
		url: url,
		selector: selector || 'body',
		wait: waitAtLeast || 4000,
		timeout: timeoutAt || 10000
	}));
	sander.writeFileSync(shPath, 'npx slimerjs ' + filePath);
	shell.exec('chmod +x ' + shPath);
	var r = shell.exec(`sh ${shPath}`, {
		silent: true,
		verbose: false
	});
	rimraf.sync(filePath);
	rimraf.sync(shPath);
	if (r.code !== 0) {
		fs.appendFileSync(cwdFile('log.txt'), `CODE ${r.code} STDERR ${r.stderr} STDOUT ${r.stdout}\n  ${url}`);
	} else {
		fs.appendFileSync(cwdFile('log.success.txt'), `CODE ${r.code} STDERR ${r.stderr} STDOUT\n\n${r.stdout}\n\n`);
	}
	return (r.code === 0 && r.stdout) || '';
}