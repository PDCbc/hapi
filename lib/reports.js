'use strict';
var async = require('async'),
    _ = require('lodash'),
    logger = require('./logger');

/**
 * Manage request for tabular reports. 
 * @param  {Function} next The async callback. Signature (error, result)
 */
function reports(next, data){

    logger.warn("loading reports module!"); 

    var router = new require('express').Router();

    router.route("/").get( 
        data.middleware.verifyAuth,
        function(req, res){

            //TODO: Check that there are the required query executions
            //      prior to returning whether or not we can generate the report.

            res.json([
                {
                    title:"Polypharmacy Report",
                    shortTitle:"polypharmacyReport"
                }
            ]);

        }
    ); 

    router.route('/:title').get(
        data.middleware.verifyAuth,
        function(req, res){

           res.json("HI MY NAME IS "+req.params.title);

        }
    );

    data.httpd.use("/reports", router); 

    logger.warn("done loading reports module");

    next(null, router);
}

// This module depends on the `environment` task.
module.exports = [ 'middleware', 'httpd', 'models', 'routes', reports ];