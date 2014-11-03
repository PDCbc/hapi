'use strict';

var async = require('async'),
    _ = require('lodash'),
    logger = require('./lib/logger');

async.auto({
    environment:  require('./lib/environment'),
    database:     require('./lib/database'),
    certificate:  require('./lib/certificate'),
    httpd:        require('./lib/httpd'),
    models:       require('./lib/models'),
    routes:       require('./lib/routes'),
    devroutes:    require('./lib/devroutes'),
}, complete);

function complete(error, data) {
    if (error) { logger.error(error); throw error; }
    // No errors
    require('https').createServer(data.certificate, data.httpd).listen(process.env.PORT, function () {
        logger.success('Server listening on port ' + process.env.PORT);
    });
}
