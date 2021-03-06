'use strict';
var async = require('async'),
    _ = require('lodash'),
    logger = require('./logger');

/**
 * Sets up the database models for this application.
 * @param  {Function} next The async callback. Signature (error, result)
 * @param  {Object}   data Contains results of the `database` task.
 */
function models(next, data) {
    return next(null, {
        user: require('../models/user'),
        // Data
        processed_result: require('../models/processed_result'),
        query: require('../models/query'),
        result: require('../models/result'),
        visualization: require('../models/visualization')
    });
}

// This task depends on the `database` task.
module.exports = ['database', models];
