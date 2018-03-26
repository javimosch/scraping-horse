var Horseman = require('node-horseman');
var horseman = new Horseman();

const cheerio = require('cheerio')


horseman
  .userAgent('Mozilla/5.0 (Windows NT 6.1; WOW64; rv:27.0) Gecko/20100101 Firefox/27.0')
  .open('https://dether.io/roadmap')
  //.type('input[name="q"]', 'github')
  //.click('[name="btnK"]')
  .keyboardEvent('keypress', 16777221)
  .waitForSelector('.vertical-timeline-content h2')
  .html('#vertical-timeline')
  //.log() // prints out the number of results
  .then(html=>{
  		var res = [];
  		var $ = cheerio.load(html);
  		$('.vertical-timeline-block').each(function(i,el){
  			let title = $(this).find('.vertical-timeline-content h2 span').text()
  			let text = $(this).find('.vertical-timeline-content p span').text()
  			let date = $(this).find('.vertical-timeline-content .vertical-date').text()
  			res.push({
  				title,
  				text,
  				date
  			});
  		});
  		console.log(JSON.stringify(res,null,2));
  })
  .close();

