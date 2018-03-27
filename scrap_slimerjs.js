var page = require('webpage').create();
page.open('$url', function(status) {
	
	(async()=>{
		let html = await waitFor('main h1 + div table + h2 + div', page);
		console.log('MAIN IS HERE', html);
		slimer.exit();	
	})().catch(err=>{
		console.log(err);
		slimer.exit();	
	});
});


function waitFor(selector, page, waitMilliseconds = 5000, timeout = 15000) {
	let start = Date.now();
	return new Promise((resolve, reject) => {
		function loop() {
			let res = page.evaluate(function(s) {
				var el = document.querySelector(s);
				return el && el.innerHTML;
			}, selector);
			var elapsed = Date.now() - start;
			if (res !== null && elapsed > waitMilliseconds) {
				resolve(res);
			} else {
				if (elapsed > timeout) {
					reject(new Error('wait for timeout'));
				} else {
					setTimeout(loop, 100);
				}
			}
		}
		loop();
	});
}