var page = require('webpage').create();
page.open('https://paxful.com/user/tlax365', function(status) {
	(async()=>{
		let html = await waitFor('.profile-avatar-wrapper + .col_one_fifth', page, '2000','3000');
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