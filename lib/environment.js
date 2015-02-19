'use strict';
var async = require('async'),
    _ = require('lodash'),
    logger = require('./logger');

/**
 * This task sets and checks for ENV variables which the application cares about.
 * @param  {Function} next The callback for node async
 */
function environment(next) {
    if (!process.env.SECRET) {
        // SECRET is used for cookies and sessions. Make sure to choose something password-y.
        logger.warn('No $SECRET present. Generating a temporary random value.');
        process.env.SECRET = require('crypto').randomBytes(256);
    }
    if (!process.env.PORT) {
        // PORT is what the application listens on.
        logger.warn('No $PORT present. Choosing a sane default, 8080.');
        process.env.PORT = 8080;
    }
    if (!process.env.MONGO_URI) {
        // The MongoDB URI to connect to.
        logger.warn('No $MONGO_URI present. Defaulting to `mongodb://localhost/query_composer_development`.');
        process.env.MONGO_URI = 'mongodb://localhost/query_composer_development';
    }
    if (!process.env.ROLES) {
        // The roles file (path)
        logger.warn('No $ROLES present. Defaulting to `./roles`');
        process.env.ROLES = './roles';
    }
    if (process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0') {
        // Allow node to accept self-signed certificates. Used in development. Should not be needed in production.
        logger.warn('The application set set to reject any non-CA signed Certs. To allow, set NODE_TLS_REJECT_UNAUTHORIZED = 0');
    }
    return next(null);
}

// This task has no dependencies.
module.exports = environment;
