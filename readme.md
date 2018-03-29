# Scraper

This project is intended to be used locally

- yarn
- yarn start

## Features

- Scrape raw innerHTML from static and dynamic websites dom selectors, manipulate the data using jquery (jsdom) or cheerio and store it in json.
- CSV export.

### Envs


- PORT
````
PORT=3001 yarn start
````
- dbURI

### How it works

Switch between the current available datasets.
````
//localBitcoin paxful localethereum
const LIST_NAME = 'localBitcoin';
````
- true: No scraping, just parsing.
- false: Scrape the dataset (links) again.
````
const ONLY_RUN_PARSERS = true;
````
- true: Every link in the dataset will be scraped
- false: Already scraped links will be skiped
````
const IGNORE_RESOLVED = false;
````

````
const EXPORT_CSV=false;
const EXPORT_CSV_DELIMITER=",";
const EXPORT_CSV_NAME = LIST_NAME + '.csv';
````
- true: All the available lists records in the output.json will be parsed and exported.
- false: Only the records of the selected LIST_NAME will be parsed and exported.
````
const EXPORT_ALL_LISTS = false;
````

CSV Fields
````
const EXPORT_KEYS = ['username','email','phone','telegram'];
const EXPORT_CONDITION_KEY=['email'];
````
## Available libraries/methods

See index.js for more information.
````
cheerio,
sequential,
fse,
progressBar,
_,
getHtmlFromPage,
readFile,
readFileAndSplitLines,
filterNoResolved,
updateOutputItem,
getSelectorInnerHtmlFromRawHTML,
progressBarUpdate,
forEachOutputItem,
firstArrayValue,
splitWords,
isEmail,
isPhone,
downloadOutputListCSV,
isTelegram,
$
````

## Datasets

The datasets (links to scrape) are stored in a file [LIST_NAME].txt

## Output (Parsed data)
The output is stored in a file named output.json
Each root property has the same name the LIST_NAME.

````
{
	[LIST_NAME]:[{
    	link: "[static url]",
        username:'',
        phone:'',
        email:'',
        telegram:''
    }]
}
````

## How to add a new site

- Create the dataset file [LIST_NAME].txt
- Implement **getRawHtml** and **getParser** for the new [LIST_NAME]

