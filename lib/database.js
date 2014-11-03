'use strict';
var async = require('async'),
    _ = require('lodash'),
    logger = require('./logger');

function database(callback, data) {
    var connection = require('mongoose').connect(process.env.MONGO_URI).connection;
    connection.on('open', function () {
        logger.log('Connected to database on ' + process.env.MONGO_URI);
        return callback(null);
    });
    connection.on('error', function (error) {
        return callback(error, connection);
    });
}

module.exports = [ 'environment', database ];
