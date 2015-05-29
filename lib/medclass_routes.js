'use strict';
var async           = require('async');
var _               = require('lodash')
var logger          = require('./logger').Logger("medclass_routes", 2);
var util            = require('util');
var request         = require('request');
var groupManager    = require('./groups');
var test            = require('../test/medclass.js'); 
var ResultManager   = require("./ResultManager.js").ResultManager;
var MedClassResultManager = require("./MedClassResultManager.js").MedClassResultManager;

function medclass_routes(next, data){

    var router = new require('express').Router();


    router.route("/").get(
        function(req, res, next){

            next();

        },
        data.middleware.verifyAuth,
        function(req, res){

            data.models.query.find({title : 'PDC-055'}).exec(

                function(err, result){

                    if ( err ){

                        logger.error('/medclass : Could not load query data from HubDB, error: '+err);
                        res.status(500);
                        res.json("Could not load query data from HubDB. See logs for details.");
                        return;

                    }


                    if ( !result || !result.length || result.length !== 1 ){

                        logger.error("Invalid number of results from Mongo.")
                        res.status(500);
                        res.json("Invalid number of results from Mongo.")
                        return; 

                    }

                    if( !result[0].executions || result[0].executions.length < 1 ){

                        logger.error("Query has no executions.")
                        res.status(403);
                        res.json({message: "Query has no executions", processed_result : { } })
                        return; 

                    }

                    var exe = result[0].executions[result[0].executions.length - 1]; //get the most recent execution

                    /**********************************/
                    // REMOVE THIS LINE AFTER WE ARE DONE DEVELOPMENT
                    exe = test.testResult;
                    /***********************************/

                    logger.debug("Current ID: "+req.session.user.clinician);

                    var x = MedClassResultManager('cpsid', exe);


                    x.getFormattedData(function(data){
                        res.json({processed_result : {}});
                    });


                }
            );
        }
    );

    // Attach the router
    data.httpd.use('/medclass', router);
    return next(null, router);
}

// This task depends on `models` and `httpd` tasks.
module.exports = ['models', 'httpd', medclass_routes ]
