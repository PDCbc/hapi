'use strict';

//Modules
var async           = require('async');
var _               = require('lodash')
var logger          = require('./logger');
var util            = require('util');
var request         = require('request');
var groupManager    = require('./groups');


function medclass_routes(next, data){

    var router = new require('express').Router();


    router.route("/").get(
        data.middleware.verifyAuth,
        function(req, res){

            data.models.query.find({title : 'PDC-055'}).exec(

                function(err, result){

                    if ( err ){

                        logger.error('/medclass : Could not load query data from HubDB, error: '+err);
                        res.status(500);
                        res.json("Could not load query data from HubDB. See logs for details.");

                    }

                    logger.success(util.inspect(result.executions));

                    res.json({stuff : "Some Message"});

                }
            );

        }
    );

    // Attach the router
    data.httpd.use('/medclass', router);
    next(null, router);
}

// This task depends on `models` and `httpd` tasks.
module.exports = ['models', 'httpd', medclass_routes ]
