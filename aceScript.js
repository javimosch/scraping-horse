
//comment/uncomment the follow line to process each website

const LIST_NAME = 'localBitcoin';
//const LIST_NAME = 'paxful';
//const LIST_NAME = 'localethereum';

const ONLY_RUN_PARSERS = true;
const IGNORE_RESOLVED = false;
const EXPORT_CSV=false;
const EXPORT_CSV_DELIMITER=",";
const EXPORT_CSV_NAME = LIST_NAME + '.csv';
const EXPORT_ALL_LISTS = false;

const EXPORT_KEYS = ['username','email','phone','telegram'];
//const EXPORT_KEYS = ['email'];

const EXPORT_CONDITION_KEY=['email'];//only records with email
//const EXPORT_CONDITION_KEY=[];//any record with at least one field
        
var getRawHtml = {
    localBitcoin:url=>{
        let html = getHtmlFromPage(url, 'nav + .container > .row .col-md-6', 2000, 3000);
        let raw = html && getSelectorInnerHtmlFromRawHTML(html,'.overflow-catch');
        return raw;
    },
    paxful:url=>{
        let raw = getHtmlFromPage(url, '.profile-avatar-wrapper + .col_one_fifth', 2000, 3000);
        return raw;
    },
    localethereum:url=>{
        let raw = getHtmlFromPage(url, 'main > .container > div > h1 + div table + h2 + div', 4000, 5000);
        return raw;
    }
};

var getParser = {
    localBitcoin:{
        username:(raw,url)=>{return url.split('profile/')[1].replace('/','');},
        email:(raw)=>{
            return firstArrayValue(splitWords(raw).filter(word=>{
                return isEmail(word);
            }));
        },
        phone:(raw)=>{
            return firstArrayValue(splitWords(raw).filter(word=>{
                word = word.replace(/\./g,' ');
                word = word.replace(new RegExp('-', 'g'), '');
                return isPhone(word);
            }),w=>w.replace(/\./g,''));
        },
        telegram:(raw)=>{
            return firstArrayValue(splitWords(raw).filter(word=>{
                return isTelegram(word);
            }));
        }
    },
    paxful:{
        username:(raw)=>{return '';},
        email:(raw)=>{
            return firstArrayValue(splitWords(raw).filter(word=>{
                return isEmail(word);
            }));
        },
        phone:(raw)=>{
            return firstArrayValue(splitWords(raw).filter(word=>{
                return isPhone(word);
            }));
        },
        telegram:(raw)=>{
            return firstArrayValue(splitWords(raw).filter(word=>{
                return isTelegram(word);
            }));
        }
    },
    localethereum:{
        username:(raw)=>{return '';},
        email:(raw)=>{
            return firstArrayValue(splitWords(raw).filter(word=>{
                return isEmail(word);
            }));
        },
        phone:(raw)=>{
            return firstArrayValue(splitWords(raw).filter(word=>{
                return isPhone(word);
            }));
        },
        telegram:(raw)=>{
            return firstArrayValue(splitWords(raw).filter(word=>{
                return isTelegram(word);
            }));
        }
    }
};


//script function should return a promise
function script(){
    return new Promise((resolve,reject)=>{
        var resultItems = [];
        var arr = readFileAndSplitLines(LIST_NAME+'.txt');
        //arr = _.take(arr,5);
        var toProcess = filterNoResolved(_.uniq(arr),LIST_NAME,IGNORE_RESOLVED);
        var alreadyResolvedLength = _.uniq(arr).length-toProcess.length;
        var skipedLength = 0;
        //toProcess = _.take(toProcess,0);
        
        if(ONLY_RUN_PARSERS){
            forEachOutputItem(LIST_NAME,data=>{
                if(!data.raw) return;
                updateOutputItem(LIST_NAME,{
                    link: data.link,
                    username:getParser[LIST_NAME].username(data.raw,data.link),
                    email:getParser[LIST_NAME].email(data.raw,data.link),
                    phone:getParser[LIST_NAME].phone(data.raw,data.link),
                    telegram:getParser[LIST_NAME].telegram(data.raw,data.link),
                    raw: data.raw,
                    resolved:true
                }, (data)=> resultItems.push(data),['username','email','phone','telegram']);
            });
        }else{
            progressBar.start(toProcess.length,0);
            let toProcessReal = toProcess;
            toProcessReal.forEach((url, index)=>{
                let raw = getRawHtml[LIST_NAME](url);
                if(!raw){
                    skipedLength++;
                    updateOutputItem(LIST_NAME,{
                        link: url,
                        resolved:true,
                        skiped:true,
                        err:'unable to find the right dom element'
                    });
                }else{
                    updateOutputItem(LIST_NAME,{
                        link: url,
                        username:getParser[LIST_NAME].username(raw,url),
                        email:getParser[LIST_NAME].email(raw,url),
                        phone:getParser[LIST_NAME].phone(raw,url),
                        telegram:getParser[LIST_NAME].telegram(raw,url),
                        raw: raw,
                        resolved:true
                    }, (data)=> resultItems.push(data),['username','email','phone','telegram'],true);
                }
                progressBarUpdate(index+1, toProcess.length);
            });
            progressBar.stop();
        }
        let totalExportedRecords = 0;
        
             totalExportedRecords =  downloadOutputListCSV(EXPORT_CSV, EXPORT_CSV_NAME,EXPORT_ALL_LISTS?'*':LIST_NAME,EXPORT_KEYS, EXPORT_CSV_DELIMITER, EXPORT_CONDITION_KEY);
        
        resolve({
            originalLength: arr.length,
            lengthWithoutDuplication: _.uniq(arr).length,
            alreadyResolvedLength: alreadyResolvedLength,
            lengthSkiped: skipedLength,
            lengthProcessed: toProcess.length,
            totalAvailable:alreadyResolvedLength+toProcess.length,
            totalEmails: resultItems.filter(i=>!!i.email).length,
            totalPhones: resultItems.filter(i=>!!i.phone).length,
            totalTelegrams: resultItems.filter(i=>!!i.telegram).length,
            totalExportedRecords: totalExportedRecords,
            itemsWithAtLeastOneField: resultItems.length,
            items: resultItems
        });
    });
}
  


  


  










