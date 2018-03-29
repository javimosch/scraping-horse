const mongoose = require('mongoose');

if (process.env.NODE_ENV !== 'production') {
	mongoose.set('debug', true);
}

var self = module.exports = {
	connections: {},
	connect: () => {
		return new Promise((resolve, reject) => {
			if (!process.env.dbURI) return reject(new Error('dbURI required'));
			var conn = mongoose.createConnection(process.env.dbURI);
			conn.on('connected', ()=>{
				console.log('Connection MAIN open.');
			});
			conn.on('disconnected', ()=>{});
			conn.model('scripts', new mongoose.Schema({}, {
				strict: false
			}));
			self.connections.main = conn;
			resolve();
		});
	}
}