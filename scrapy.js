'use strict';

const jsdom = require("jsdom");
const Crawler = require("crawler");
const url = require('url');
const Spreadsheet = require('edit-google-spreadsheet');

if (!process.argv[2]) throw 'You must specify a web page!';

let host = 'https://www.youmagine.com';
let link = process.argv[2];
let googleTablesData = [];
let allLinksToPages = [];
let count = 0;
let youMaginePageCount = 1;
let thingiVersePageCount = 1;
let lastPageCount;

if (process.argv[3] && process.argv[4]) {
    youMaginePageCount = process.argv[3];
    thingiVersePageCount = process.argv[3];
    lastPageCount = process.argv[4];
}

if (link.match('thingiverse')) host = 'http://www.thingiverse.com';


let c = new Crawler({
    maxConnections : 10,
    callback : (error, result, $) => {
        $('a').each(function(index, a) {
            let toQueueUrl = $(a).attr('href');
            c.queue(toQueueUrl);
        });
    }
});

if (link.match('thingiverse')) thingiVerseGetAll('http://www.thingiverse.com/ajax/things/paginate_things?page='+thingiVersePageCount);
else youMagineGetAll('https://www.youmagine.com/designs/latest?page='+youMaginePageCount+'&state=50');


/**************************************
****** https://www.youmagine.com ******
***************************************/

function youMagineGetAll(url) {
    c.queue([{
        uri: url,
        jQuery: false,
        callback: (error, result) => {
            let isGettingContent = false;
            jsdom.env(
                result.body,
                ["./jquery.js"],
                (err, window) => {
                    window.$.each(window.$('#js-load-more').find('.tile').find('a:first-child'), (i, v) => {
                        allLinksToPages.push(host + window.$(v).attr('href'));
                        isGettingContent = true;
                    });
                    if (isGettingContent) {
                        if (lastPageCount) {
                            if (youMaginePageCount < lastPageCount) {
                                youMaginePageCount++;
                                youMagineGetAll('https://www.youmagine.com/designs/latest?page=' + youMaginePageCount + '&state=50');
                            } else {
                                getContentFromYouMaginePage();
                            }
                        } else {
                            youMaginePageCount++;
                            youMagineGetAll('https://www.youmagine.com/designs/latest?page=' + youMaginePageCount + '&state=50');
                        }
                    } else {
                        getContentFromYouMaginePage();
                    }
                }
            );
        }
    }]);
}
/*
 * Steal content from https://www.youmagine.com
 * */
function getContentFromYouMaginePage() {
    c.queue([{
        uri: allLinksToPages[count],
        jQuery: false,
        callback: (error, result) => {

            if (allLinksToPages.length == 0) {
                console.log('------------------------');
                console.log('Done!');
                return;
            }

            jsdom.env(
                result.body,
                ["./jquery.js"],
                (err, window) => {
                    let documentId,
                        pageUrl = allLinksToPages[count],
                        description = window.$('#information').find('.description').text(),
                        title = window.$('#collection-delete-confirmation-dialog').next().text();

                    window.$.each(window.$("#documents").find('.document'), (i, v) => {
                        if (window.$(v).find('.meta').find('.file-info').text().match('STL')) {
                            if (documentId) { documentId = documentId + ', ' + host + window.$(v).find('.download').attr('href'); }
                            else { documentId = host + window.$(v).find('.download').attr('href'); }
                        }
                    });
                    window.$.each(window.$('#js-carousel').find('.images').find('.image'), (i, v) => {
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
                    window.$.each(window.$('#js-carousel').find('.images').find('iframe'), (i, v) => {
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

                                googleTablesData = [];
                                if (allLinksToPages.length > 0) {
                                    allLinksToPages.splice(0, 1);
                                    getContentFromYouMaginePage();
                                } else {
                                    console.log('------------------------');
                                    console.log('Done!');
                                }
                            });
                        });
                    });
                }
            );
        }
    }]);
}


/****************************************
******* http://www.thingiverse.com ******
*****************************************/

function thingiVerseGetAll(url) {
    c.queue([{
        uri: url,
        jQuery: false,
        callback: (error, result) => {
            let isGettingContent = false;
            jsdom.env(
                result.body,
                ["./jquery.js"],
                (err, window) => {
                    window.$.each(window.$('.things-page').find('.thing-img-wrapper'), (i, v) => {
                        allLinksToPages.push(host + window.$(v).attr('href'));
                        isGettingContent = true;
                    });
                    if (isGettingContent) {
                        if (lastPageCount) {
                            if (thingiVersePageCount < lastPageCount) {
                                thingiVersePageCount++;
                                thingiVerseGetAll('http://www.thingiverse.com/ajax/things/paginate_things?page='+thingiVersePageCount);
                            } else {
                                getContentFromThingiVersePage();
                            }
                        } else {
                            youMaginePageCount++;
                            thingiVerseGetAll('http://www.thingiverse.com/ajax/things/paginate_things?page='+thingiVersePageCount);
                        }
                    } else {
                        getContentFromThingiVersePage();
                    }
                }
            );
        }
    }]);
}
/*
* Steal content from http://www.thingiverse.com
* */
function getContentFromThingiVersePage() {
    c.queue([{
        uri: allLinksToPages[count],
        jQuery: false,
        callback: (error, result) => {

            if (allLinksToPages.length == 0) {
                console.log('------------------------');
                console.log('Done!');
                return;
            }

            jsdom.env(
                result.body,
                ["./jquery.js"],
                (err, window) => {
                    let documentId,
                        pageUrl = allLinksToPages[count],
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

                                googleTablesData = [];
                                if (allLinksToPages.length > 0) {
                                    allLinksToPages.splice(0, 1);
                                    getContentFromThingiVersePage();
                                } else {
                                    console.log('------------------------');
                                    console.log('Done!');
                                }
                            });
                        });
                    });
                }
            );
        }
    }]);
}