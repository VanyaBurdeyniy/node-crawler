'use strict';

const content = require('./controllers/content.controller');

module.exports = function(app) {
    app.route('/content/add').post(content.add);
    app.route('/content').get(content.get);
};