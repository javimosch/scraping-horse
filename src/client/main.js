var jsonexport = require('jsonexport/dist');

var socket = require('socket.io-client')();//'http://localhost'
socket.on('connect', console.info);
socket.on('status', console.warn);
socket.on('reconnect', console.warn);
socket.on('disconnect', console.info);

//var socket = io();

var editor = ace.edit("editor");
editor.setTheme("ace/theme/monokai");
editor.session.setMode("ace/mode/javascript");

socket.on('connect', function() {
    socket.on('result:catch', (err) => {
        $('.runBtn').fadeIn();
        $('.loading').fadeOut();
        $('.warnings').toggle(true).find('.list').prepend('<div class="closable warning-item item">' + JSON.stringify(err, null, 2) + '<div>');
    });

    socket.on('result:step', (progressStr) => {
        $('.warnings').toggle(true).find('.list').prepend('<div class="closable info-item item">' +
            `Progress ${progressStr}` + '<div>');
    });

    socket.on('script:fetch:then', (code) => {
        editor.session.setValue(code);
    });


    socket.on('downloadCSV', (params) => {
        downloadCSV(params.name, params.data, params.delimiter);
    });

    socket.on('result:then', res => {
        $('.runBtn').fadeIn();
        $('.loading').fadeOut();
        console.log(res);
        if (typeof res === 'string') {
            res = {
                result: res
            }
        }

        let id = 'res-' + Date.now().toString();
        $('.warnings').toggle(true).find('.list').empty().prepend(`<div>
          <label>Returned at ${moment().format('HH:mm DD/MM/YYYY')}</label>
          <div id="${id}" class="result-item item json-editor"><div>
          </div>`);

        var editor = ace.edit(id);
        editor.setTheme("ace/theme/monokai");
        editor.session.setMode("ace/mode/json");

        let text = JSON.stringify(res, null, 2)
        editor.session.setValue(text);
    });

});





window.runScraper = runScraper;

function runScraper() {
    $('.loading').fadeIn();
    $('.runBtn').toggle(false);
    socket.emit('runScraper', {
        js: editor.getSession().getValue()
    })
}

$('.warnings').on('click', '.closable', function() {
    $(this).remove();
});
$('.warnings').on('click', '.close', function() {
    $('.warnings').toggle(false);
});

$(document).keyup(function(e) {
    if (e.keyCode == 27) { // escape key maps to keycode `27`
        $('.warnings').toggle(false);
    }
});

function downloadFile(content, fileName, mimeType) {
    var a = document.createElement('a');
    mimeType = mimeType || 'application/octet-stream';

    if (navigator.msSaveBlob) { // IE10
        navigator.msSaveBlob(new Blob([content], {
            type: mimeType
        }), fileName);
    } else if (URL && 'download' in a) { //html5 A[download]
        a.href = URL.createObjectURL(new Blob([content], {
            type: mimeType
        }));
        a.setAttribute('download', fileName);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } else {
        location.href = 'data:application/octet-stream,' + encodeURIComponent(content); // only this mime type is supported
    }
}

function downloadCSV(fileName, data, rowDelimiter = '|') {
    return new Promise((resolve, reject) => {
        jsonexport(data, {
            rowDelimiter
        }, function(err, csv) {
            if (err) {
                console.error(err);
                reject(err);
            } else {
                downloadFile(csv, fileName, 'text/csv;encoding:utf-8');
            }
        });
    });
}