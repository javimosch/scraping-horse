var app = require('express')();
var errorToJSON = require('error-to-json')
var http = require('http').Server(app);
var io = require('socket.io')(http);
var shell = require('shelljs');
var path = require('path');
var base64 = require('base-64');
const fse = require('fs-extra')
var sander = require('sander');
var shortid = require('shortid');
var rimraf = require('rimraf');
app.get('/', function(req, res) {
	res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket) {
	console.log('Client connected');
	socket.on('test', function(params) {
		test(params);
	});
});

http.listen(process.env.PORT || 3000, function() {
	console.log('listening on', process.env.PORT || 3000);
});

function isParsable(code){
	try{
		JSON.parse(code);
		return true;
	}catch(err){
		return false;
	}
}


function compileTemplate(src, obj){
	Object.keys(obj).forEach(k=>{
		src = src.replace(new RegExp('__'+k.toUpperCase()+'__', 'g'), obj[k]);
	});
	return src;
}

function test(params){
	console.log('START\n\n');
		let encodedCode = base64.encode(JSON.stringify(params.js));
		
		var r 

		var isSlimerJS = ()=> params.js.indexOf('run_slimerjs')!==-1;

		if(isSlimerJS()){

			let template = sander.readFileSync('./scrap_slimerjs.js').toString('utf-8');
			let jsFileName = shortid.generate()+'.js';
			let filePath = './slimer-temp/'+jsFileName;
			let shPath = './'+shortid.generate()+'.sh';

			sander.writeFileSync(filePath, compileTemplate(template,{
				url: "https://localethereum.com/es/profile/yeissone",
				selector:'main h1 + div table + h2 + div',
				wait: 4000,
				timeout: 10000
			}));

			sander.writeFileSync(shPath,'npx slimerjs '+filePath);
			shell.exec('chmod +x '+shPath);
			

			
			r = shell.exec(`sh ${shPath}`,{silent:false, verbose:true});

			rimraf.sync(filePath);
			rimraf.sync(shPath);

			console.log('SLIMER RESULT', r && r.code,  r && r.stdout, r && r.stderr);

			console.log('COMPILED')
			process.exit(1);

		}else{
			r = shell.exec(`node ${path.join(process.cwd(),'scrap.js')} --code="${encodedCode}"`,{silent:false});
		}

		console.log('\n\nEND');


		if(r.code===0){
			
			(async()=>{

				if(isSlimerJS()){
					console.log('SLIMERJS STDOUT',r.stdout);
					return {
						stdout: r.stdout
					};
				}

				return await fse.readJson(`./output.json`)
			})().then(res=>{
				socket.emit('result:then', res);	
			}).catch(err=>{
				socket.emit('result:catch', {
					err:errorToJSON(new Error('Invalid output file')),
					details:errorToJSON(err)
				});	
			});
			
		}else{
			console.log('ERROR',r.stdout, r.stderr);
			socket.emit('result:catch', r.stdout);
		}
}
