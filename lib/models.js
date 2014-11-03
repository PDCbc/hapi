'use strict';
var async = require('async'),
    _ = require('lodash'),
    logger = require('./logger');

function models(callback, data) {
    return callback(null, {
        user         : require('../models/user'),
        // Data
        query        : require('../models/query'),
        result       : require('../models/result')
    });
}

module.exports = [ 'database', models ];
