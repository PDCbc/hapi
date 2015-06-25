'use strict';
var async  = require('async');
var logger = require('../logger').Logger('demographic_routes', 1);
var util = require('util');
var auth   = require('../auth');


/**
 * Sets up the standard routes for the application. Check the express documentation on routers.
 * @param  {Function} next The async callback. Signature (error, result)
 * @param  {Object}   data Contains results of the `models` and `httpd` task.
 */
function demographic_routes(next, data) {

    var router = new require('express').Router();

    router.route('/').get(
        data.middleware.verifyAuth,
        function (req, res, next) {



        }
    );

    data.httpd.use('/demographics', router);
    next(null, router);
}

module.exports = ['models', 'httpd', 'middleware', demographic_routes];
