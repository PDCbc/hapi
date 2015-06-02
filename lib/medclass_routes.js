'use strict';
var async           = require('async');
var _               = require('lodash')
var logger          = require('./logger').Logger("medclass_routes", 1);
var util            = require('util');
var request         = require('request');
var groupManager    = require('./groups');
var test            = require('../test/medclass.js'); 
var ResultManager   = require("./ResultManager.js").ResultManager;
var MedClassResultManager = require("./MedClassResultManager.js").MedClassResultManager;

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
                    //exe = test.testResult;
                    /***********************************/

                    logger.debug("Current ID: "+req.session.user.clinician);

                    var x = MedClassResultManager('cpsid', JSON.parse(JSON.stringify(exe)));

                    x.getFormattedData(function(data){

                        //need to go through and set time on the all of the
                        //drug objects.
                        var tmp = data.processed_result.drugs
                        for( var i = 0; i < tmp.length; i++ ){

                            tmp[i].agg_data[0].time = exe.time; 
                            tmp[i].agg_data[1].time = exe.time; 
                            tmp[i].agg_data[2].time = exe.time; 

                        }

                        res.json(data);
                        
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
