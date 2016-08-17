var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Contentchema = new Schema({
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

Contentchema.pre('save', function(next) {
    next();
});

mongoose.model('Content', Contentchema);