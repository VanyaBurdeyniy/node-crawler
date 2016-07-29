'use strict';

var jsdom = require("jsdom");
var Crawler = require("crawler");
var url = require('url');
var mongoose = require('mongoose');
var db = mongoose.connect('mongodb://188.166.161.9:27017/node-crawler');
require('./models/content.model');
var Content = mongoose.model('Content');

if (!process.argv[2]) throw 'You must specify a web page!';

console.log('Run!!!');

var host = 'https://www.youmagine.com',
    link = process.argv[2],
    googleTablesData = [],
    allLinksToPages = [],
    count = 0,
    youMaginePageCount = 1,
    thingiVersePageCount = 1,
    lastPageCount;

if (process.argv[3] && process.argv[4]) {
    youMaginePageCount = process.argv[3];
    thingiVersePageCount = process.argv[3];
    lastPageCount = process.argv[4];
}

if (link.match('thingiverse')) host = 'http://www.thingiverse.com';


var c = new Crawler({
    maxConnections : 10,
    callback : function(error, result, $) {
        $('a').each( function(index, a)  {
            var toQueueUrl = $(a).attr('href');
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
        callback: function(error, result) {
            var isGettingContent = false;
            jsdom.env(
                result.body,
                ["./jquery.js"],
                function(err, window)  {
                    window.$.each(window.$('#js-load-more').find('.tile').find('a:first-child'), function(i, v) {
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
        callback: function(error, result) {

            if (allLinksToPages.length == 0) {
                return console.log('-----------------------\n' +
                    'Done!');
            }

            jsdom.env(
                result.body,
                ["./jquery.js"],
                function(err, window) {
                    var documentId,
                        pageUrl = allLinksToPages[count],
                        description = window.$('#information').find('.description').text(),
                        title = window.$('#collection-delete-confirmation-dialog').next().text();

                    window.$.each(window.$("#documents").find('.document'), function(i, v) {
                        if (window.$(v).find('.meta').find('.file-info').text().match('STL')) {
                            if (documentId) { documentId = documentId + ', ' + host + window.$(v).find('.download').attr('href'); }
                            else { documentId = host + window.$(v).find('.download').attr('href'); }
                        }
                    });
                    window.$.each(window.$('#js-carousel').find('.images').find('.image'), function(i, v) {
                        var src = window.$(v).css('background-image');
                        if (src.match('jpg') || src.match('JPG')) {
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
    }]);
}


/****************************************
 ******* http://www.thingiverse.com ******
 *****************************************/

function thingiVerseGetAll(url) {
    c.queue([{
        uri: url,
        jQuery: false,
        callback: function(error, result) {
            var isGettingContent = false;
            jsdom.env(
                result.body,
                ["./jquery.js"],
                function(err, window) {
                    window.$.each(window.$('.things-page').find('.thing-img-wrapper'), function(i, v) {
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
        callback: function(error, result) {

            if (allLinksToPages.length == 0) {
                return console.log('-----------------------\n' +
                    'Done!');
            }

            jsdom.env(
                result.body,
                ["./jquery.js"],
                function(err, window) {
                    var documentId,
                        pageUrl = allLinksToPages[count],
                        description = window.$('.thing-component-header.summary').next().text(),
                        title = window.$('.thing-page-header').first().find('.thing-header-data').find('h1').text();

                    window.$.each(window.$(".thing-file-download-link"), function(i, v) {
                        if (documentId) { documentId = documentId + ', ' + host + window.$(v).attr('href'); }
                        else { if (window.$(v).attr('data-file-name').match('STL') || window.$(v).attr('data-file-name').match('stl')) documentId = host + window.$(v).attr('href'); }
                    });
                    window.$.each(window.$('.thing-gallery-thumb'), function(i, v) {
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
    }]);
}