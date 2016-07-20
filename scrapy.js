const jsdom = require("jsdom");
const Crawler = require("crawler");
const url = require('url');
const Spreadsheet = require('edit-google-spreadsheet');

if (!process.argv[2]) throw 'You must specify a web page!';

let host = 'https://www.youmagine.com';
let link = process.argv[2];
let googleTablesData = [];

if (link.match('thingiverse')) host = 'http://www.thingiverse.com';


let c = new Crawler({
    maxConnections : 10,
    callback : function (error, result, $) {
        $('a').each(function(index, a) {
            let toQueueUrl = $(a).attr('href');
            c.queue(toQueueUrl);
        });
    }
});

if (link.match('thingiverse')) thingiVerse();
else youMagine();


/*
* Steal content from http://www.thingiverse.com
* */
function thingiVerse() {
    c.queue([{
        uri: link,
        jQuery: false,

        callback: (error, result) => {
            jsdom.env(
                result.body,
                ["./jquery.js"],
                (err, window) => {
                    let documentId,
                        pageUrl = link,
                        description = window.$('.thing-component-header.summary').next().text(),
                        title = window.$('.thing-page-header').first().find('.thing-header-data').find('h1').text();

                    window.$.each(window.$(".thing-file-download-link"), (i, v) => {
                        if (documentId) { documentId = documentId + ', ' + host + window.$(v).attr('href'); }
                        else { if (window.$(v).attr('data-file-name').match('STL') || window.$(v).attr('data-file-name').match('stl')) documentId = host + window.$(v).attr('href'); }
                    });
                    window.$.each(window.$('.thing-gallery-thumb'), (i, v) => {
                        googleTablesData.push({
                            'imageUrl':window.$(v).attr('data-large-url'),
                            'title':title,
                            'description':description,
                            'pageUrl':pageUrl,
                            'documentId':documentId
                        });
                    });

                    Spreadsheet.load({
                        debug: true,
                        spreadsheetName: 'example',
                        spreadsheetId:'1s0dl-7vjKGrYjwaMBlD88uEJaAeVk0l2ttyszUKjTOU',
                        worksheetId:'od6',
                        oauth2: {
                            client_id: '697576138486-1l6e7vf2ad5qrg4e05fdaqjbrausoqv3.apps.googleusercontent.com',
                            client_secret: 'NSvtFieKBn9i9ICjGOcdDo5D',
                            refresh_token: '1/UbVmns3P6vbcCTFFwEchOau7jGEC-xFsa9crS6upO6U'
                        }
                    }, function sheetReady(err, spreadsheet) {

                        if(err) throw err;

                        spreadsheet.receive((err, rows, info) => {
                            if(err) throw err;
                            let countOfRows = 0;
                            for (let row in rows) {
                                countOfRows++;
                            }
                            countOfRows += 1;

                            googleTablesData.forEach(data => {
                                spreadsheet.add({ [countOfRows]: { 1: data.imageUrl} });
                                spreadsheet.add({ [countOfRows]: { 2: data.title} });
                                spreadsheet.add({ [countOfRows]: { 3: data.description} });
                                spreadsheet.add({ [countOfRows]: { 4: data.pageUrl} });
                                spreadsheet.add({ [countOfRows]: { 5: ''} });
                                spreadsheet.add({ [countOfRows]: { 6: ''} });
                                spreadsheet.add({ [countOfRows]: { 7: data.documentId} });
                                countOfRows++;
                            });

                            spreadsheet.send({ autoSize: true }, err => {
                                if(err) throw err;
                            });
                        });
                    });
                }
            );
        }
    }]);
}


/*
 * Steal content from https://www.youmagine.com
 * */
function youMagine() {
    c.queue([{
        uri: link,
        jQuery: false,

        callback: (error, result) => {
            jsdom.env(
                result.body,
                ["./jquery.js"],
                (err, window) => {
                    let documentId,
                        pageUrl = link,
                        description = window.$('#information').find('.description').text(),
                        title = window.$('#collection-delete-confirmation-dialog').next().text();

                    window.$.each(window.$("#documents").find('.document'), (i, v) => {
                        if (window.$(v).find('.meta').find('.file-info').text().match('STL')) {
                            if (documentId) { documentId = documentId + ', ' + host + window.$(v).find('.download').attr('href'); }
                            else { documentId = host + window.$(v).find('.download').attr('href'); }
                        }
                    });
                    window.$.each(window.$('.images').find('.image'), (i, v) => {
                        let src = window.$(v).css('background-image');
                        src = src.replace('"', '');
                        src = src.replace('url(', '');
                        src = src.replace(')', '');
                        googleTablesData.push({
                            'imageUrl':src,
                            'title':title,
                            'description':description,
                            'pageUrl':pageUrl,
                            'documentId':documentId
                        });
                    });
                    window.$.each(window.$('.images').find('iframe'), (i, v) => {
                        googleTablesData.push({
                            'imageUrl':window.$(v).attr('data-src'),
                            'title':title,
                            'description':description,
                            'pageUrl':pageUrl,
                            'documentId':documentId
                        });
                    });

                    Spreadsheet.load({
                        debug: true,
                        spreadsheetName: 'example',
                        spreadsheetId:'1s0dl-7vjKGrYjwaMBlD88uEJaAeVk0l2ttyszUKjTOU',
                        worksheetId:'od6',
                        oauth2: {
                            client_id: '697576138486-1l6e7vf2ad5qrg4e05fdaqjbrausoqv3.apps.googleusercontent.com',
                            client_secret: 'NSvtFieKBn9i9ICjGOcdDo5D',
                            refresh_token: '1/UbVmns3P6vbcCTFFwEchOau7jGEC-xFsa9crS6upO6U'
                        }
                    }, function sheetReady(err, spreadsheet) {

                        if(err) throw err;

                        spreadsheet.receive((err, rows, info) => {
                            if(err) throw err;
                            let countOfRows = 0;
                            for (let row in rows) {
                                countOfRows++;
                            }
                            countOfRows += 1;

                            googleTablesData.forEach(data => {
                                spreadsheet.add({ [countOfRows]: { 1: data.imageUrl} });
                                spreadsheet.add({ [countOfRows]: { 2: data.title} });
                                spreadsheet.add({ [countOfRows]: { 3: data.description} });
                                spreadsheet.add({ [countOfRows]: { 4: data.pageUrl} });
                                spreadsheet.add({ [countOfRows]: { 5: ''} });
                                spreadsheet.add({ [countOfRows]: { 6: ''} });
                                spreadsheet.add({ [countOfRows]: { 7: data.documentId} });
                                countOfRows++;
                            });

                            spreadsheet.send({ autoSize: true }, err => {
                                if(err) throw err;
                            });
                        });
                    });
                }
            );
        }
    }]);
}

//AIzaSyCCQglRs_Z6B1kOoemBnoIWheO-n4akFVU







//697576138486-1l6e7vf2ad5qrg4e05fdaqjbrausoqv3.apps.googleusercontent.com
//NSvtFieKBn9i9ICjGOcdDo5D



//https://spreadsheets.google.com/feeds/worksheets/YOUR_SPREADSHEET_ID/private/full