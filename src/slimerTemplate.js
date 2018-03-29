var page = require('webpage').create();
page.open('__URL__', function(status) {
	(async()=>{
		let html = await waitFor('__SELECTOR__', page, '__WAIT__','__TIMEOUT__');
		console.log(html);
		slimer.exit();	
	})().catch(err=>{
		console.log(err);
		slimer.exit(1);	
	});
});

function waitFor(selector, page, waitMilliseconds = 5000, timeout = 6000) {
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