'use strict';
var async = require('async'),
    _ = require('lodash'),
    logger = require('./logger');

function environment(callback) {
    if (!process.env.SECRET) {
        logger.warn('No $SECRET present. Generating a temporary random value.');
        process.env.SECRET = require('crypto').randomBytes(256);
    }
    if (!process.env.PORT) {
        logger.warn('No $PORT present. Choosing a sane default, 8080.');
        process.env.PORT = 8080;
    }
    if (!process.env.MONGO_URI) {
        logger.warn('No $MONGO_URI present. Defaulting to `mongodb://localhost/auth`.');
        process.env.MONGO_URI = 'mongodb://localhost/auth';
    }
    if (process.env.NODE_TLS_REJECT_UNAUTHORIZED !== 0) {
        logger.warn('The application set set to reject any non-CA signed Certs. To allow, set NODE_TLS_REJECT_UNAUTHORIZED = 0');
    }
    return callback(null);
}

module.exports = environment;
