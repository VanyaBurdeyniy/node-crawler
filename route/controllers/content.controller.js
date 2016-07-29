'use strict';

let mongoose = require('mongoose'),
    Content = mongoose.model('Content');


/**
 * Get the error message from error object
 */
let getErrorMessage = (err) => {
    let message = '';

    if (err.code) {
        switch (err.code) {
            case 11000:
            case 11001:
                message = 'This content already exists';
                break;
            default:
                message = 'Something went wrong';
        }
    } else {
        for (let errName in err.errors) {
            if (err.errors[errName].message) message = err.errors[errName].message;
        }
    }

    return message;
};


/**
 * Add content to db
 */
exports.add = (req, res) => {

    let content = new Content(req.body);
    let message = null;

    content.save( (err) => {
        if (err) {
            return res.send(400, {
                message: getErrorMessage(err)
            });
        } else {
            res.jsonp(content);
        }
    });
};


/**
 * Get all content from db
 */
exports.get = (req, res, next) => {
    Content.find({}, (err, content) => {
        if (err) {
            return err;
        }

        res.jsonp(content);

        return content;
    });
};