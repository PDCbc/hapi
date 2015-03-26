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
    else
    {
      logger.success('$SECRET provided: ' + process.env.SECRET);
    }

    if (!process.env.PORT) {
      // PORT is what the application listens on.
      logger.warn('No $PORT present. Choosing a sane default, 8080.');
      process.env.PORT = 8080;
    }
    else
    {
      logger.success('$PORT provided: ' + process.env.PORT);
    }

    if (!process.env.MONGO_URI) {
      // The MongoDB URI to connect to.
      logger.warn('No $MONGO_URI present. Defaulting to `mongodb://hub-db:27017/query_composer_development`.');
      process.env.MONGO_URI = 'mongodb://hub-db:27017/query_composer_development';
    }
    else
    {
      logger.success('$MONGO_URI provided: ' + process.env.MONGO_URI);
    }

    if (!process.env.AUTH_CONTROL) {
        logger.warn("No $AUTH_CONTROL present. Defaulting to `https://auth:3006`");
        process.env.AUTH_CONTROL = "https://auth:3006";
    } else {
        logger.success('$AUTH_CONTROL provided: ' + process.env.AUTH_CONTROL);
    }

    if (!process.env.ROLES) {
      // The roles file (path)
      logger.warn('No $ROLES present. Defaulting to `./roles`');
      process.env.ROLES = './roles';
    }
    else
    {
      logger.success('$ROLES provided: ' + process.env.ROLES);
    }

    if (process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0') {
        // Allow node to accept self-signed certificates. Used in development. Should not be needed in production.
        logger.warn('The application set set to reject any non-CA signed Certs. To allow, set NODE_TLS_REJECT_UNAUTHORIZED = 0');
    }
    else
    {
      logger.success('$NODE_TLS_REJECT_UNAUTHORIZED provided: ' + process.env.NODE_TLS_REJECT_UNAUTHORIZED);
    }

    return next(null);
}

// This task has no dependencies.
module.exports = environment;
