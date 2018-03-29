const path = require('path');
const cwd = process.cwd();
const {cwdFile} = require('./helpers');

module.exports = {
	getSocketActions
};

function getSocketActions(socket, {
	progressBar,
	getMergedLists,
	readFile,
	io
}) {
	return {
		progressBarUpdate: (step, max) => {
			progressBar.update(step);
			io.emit('result:step', step + '/' + max);
		},
		downloadOutputListCSV: (enabled, name, listName, keys, delimiter, conditionKeys) => {
			let data = JSON.parse(readFile(cwdFile(`output.json`)));
			if (listName === '*') {
				data = getMergedLists(data, Object.keys(data), keys);
			} else {
				data = getMergedLists(data, [listName], keys);
			}
			if (conditionKeys !== undefined) {
				data = data.filter(d => {
					for (var x in conditionKeys) {
						if (!d[conditionKeys[x]]) return false;
					}
					return true;
				});
			} else {
				data = data.filter(d => {
					if (!d.email && !d.phone && !d.telegram) return false;
					return true;
				});
			}
			if (!enabled) {
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