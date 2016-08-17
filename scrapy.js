'use strict';

const jsdom = require("jsdom");
const Crawler = require("crawler");
const url = require('url');
const mongoose = require('mongoose');
const db = mongoose.connect('mongodb://localhost:27017/node-crawler');
require('./models/content.model');
const Content = mongoose.model('Content');

if (!process.argv[2]) throw 'You must specify a web page!';

let host = 'http://www.thingiverse.com',
    link = process.argv[2],
    googleTablesData = [],
    allLinksToPages = [],
    count = 0,
    youMaginePageCount = 1,
    thingiVersePageCount = 1,
    lastPageCount,
    arrayCount = 1,
    isGetAllLinks;

if (process.argv[3] && process.argv[4]) {
    youMaginePageCount = process.argv[3];
    thingiVersePageCount = process.argv[3];
    lastPageCount = process.argv[4];
} else {
    isGetAllLinks = true;
}

if (link.match('thingiverse')) host = 'http://www.thingiverse.com';


let c = new Crawler({
    maxConnections : 10,
    callback : (error, result, $) => {
        $('a').each( (index, a) => {
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
                    window.$.each(window.$('#js-load-more').find('.tile').find('a'), (i, v) => {
                        if (window.$(v).attr('href') !== '/users/sign_in' && window.$(v).attr('href').match('designs')) allLinksToPages.push(host + window.$(v).attr('href'));
                        isGettingContent = true;
                    });
                    if (isGettingContent) {
                        if (lastPageCount) {
                            if (youMaginePageCount < lastPageCount) {
                                youMaginePageCount++;
                                youMagineGetAll('https://www.youmagine.com/designs/latest?page=' + youMaginePageCount);
                            } else {
                                getContentFromYouMaginePage();
                            }
                        } else {
                            if (youMaginePageCount < arrayCount) {
                                youMaginePageCount++;
                                youMagineGetAll('https://www.youmagine.com/designs/latest?page=' + youMaginePageCount);
                            } else {
                                getContentFromYouMaginePage();
                            }
                        }
                    } else {
                        isGetAllLinks = false;
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
                if (isGetAllLinks) {
                    arrayCount += 1;
                    youMaginePageCount++;
                    youMagineGetAll('https://www.youmagine.com/designs/latest?page=' + youMaginePageCount);
                } else {
                    return console.log('-----------------------\n' +
                        'Done!');
                }
            } else {
                jsdom.env(
                    result.body,
                    ["./jquery.js"],
                    (err, window) => {
                        let documentId,
                            pageUrl = allLinksToPages[count],
                            description = window.$('#information').find('.description').text(),
                            title = window.$('.design-title').text();

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
                                'imageUrl': 'https://www.youmagine.com' + src,
                                'title':title,
                                'description':description,
                                'pageUrl':pageUrl,
                                'documentId':documentId
                            });
                            if (src.match('jpg') || src.match('JPG')) {

                            }
                        });

                        if (googleTablesData.length > 0) {
                            Content.insertMany(googleTablesData);
                            googleTablesData = [];
                            if (allLinksToPages.length > 0) {
                                allLinksToPages.splice(0, 1);
                                getContentFromYouMaginePage();
                            } else {
                                return console.log('-----------------------\n' +
                                    'Done!');
                            }
                        } else {
                            console.log(allLinksToPages.length);
                            googleTablesData = [];
                            if (allLinksToPages.length > 0) {
                                allLinksToPages.splice(0, 1);
                                getContentFromYouMaginePage();
                            } else {
                                return console.log('-----------------------\n' +
                                    'Done!');
                            }
                        }
                    }
                );
            }
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
                            if (thingiVersePageCount < arrayCount) {
                                thingiVersePageCount++;
                                thingiVerseGetAll('http://www.thingiverse.com/ajax/things/paginate_things?page='+thingiVersePageCount);
                            } else {
                                getContentFromThingiVersePage();
                            }
                        }
                    } else {
                        isGetAllLinks = false;
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
                if (isGetAllLinks) {
                    arrayCount += 1;
                    thingiVersePageCount++;
                    thingiVerseGetAll('http://www.thingiverse.com/ajax/things/paginate_things?page='+thingiVersePageCount);
                } else {
                    return console.log('-----------------------\n' +
                        'Done!');
                }
            } else {
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
                            if (window.$(v).attr('data-large-url').match('jpg') || window.$(v).attr('data-large-url').match('JPG')) {
                                googleTablesData.push({
                                    'imageUrl':window.$(v).attr('data-large-url'),
                                    'title':title,
                                    'description':description,
                                    'pageUrl':pageUrl,
                                    'documentId':documentId
                                });
                            }
                        });

                        if (googleTablesData.length > 0) {
                            Content.insertMany(googleTablesData);
                            googleTablesData = [];
                            if (allLinksToPages.length > 0) {
                                allLinksToPages.splice(0, 1);
                                getContentFromThingiVersePage();
                            } else {
                                return console.log('-----------------------\n' +
                                    'Done!');
                            }
                        } else {
                            googleTablesData = [];
                            if (allLinksToPages.length > 0) {
                                allLinksToPages.splice(0, 1);
                                getContentFromThingiVersePage();
                            } else {
                                return console.log('-----------------------\n' +
                                    'Done!');
                            }
                        }
                    }
                );
            }
        }
    }]);
}