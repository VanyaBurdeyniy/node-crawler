'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let Contentchema = new Schema({
    imageUrl:String,
    title: String,
    description: String,
    pageUrl: String,
    documentId: String,
    created: {
        type: Date,
        default: Date.now
    }
});

Contentchema.pre('save', next => {
    next();
});

mongoose.model('Content', Contentchema);