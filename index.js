var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var shell = require('shelljs');
var path = require('path');
var base64 = require('base-64');

app.get('/', function(req, res) {
	res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket) {
	console.log('Client connected');
	socket.on('test', function(params) {
		console.log('Executing....');
		let encodedCode = base64.encode(JSON.stringify(params.js));
		let r = shell.exec(`node ${path.join(process.cwd(),'scrap.js')} --code="${encodedCode}"`,{silent:false});
		if(r.code===0){
			console.log('SUCCESS',r.stdout.length);
			if(isParsable(r.stdout)){
				socket.emit('result:then', JSON.parse(r.stdout));	
			}else{
				socket.emit('result:catch', errorToJSON(new Error('Unable to parse stdout')));
			}
		}else{
			console.log('ERROR',r.stdout);
			socket.emit('result:catch', r.stdout);
		}
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
