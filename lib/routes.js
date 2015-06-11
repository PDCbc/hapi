'use strict';
var async   = require('async');
var _       = require('lodash');
var logger  = require('./logger').Logger('routes', 1);
var util    = require('util');
var RatioResultManager = require('./RatioResultManager').RatioResultManager; 

/**
 * Sets up the standard routes for the application. Check the express documentation on routers.
 * @param  {Function} next The async callback. Signature (error, result)
 * @param  {Object}   data Contains results of the `models` and `httpd` task.
 */
function routes(next, data) {

  var router = new require('express').Router();

  var execution_ids = [];

  router.get('/api',

    data.middleware.verifyAuth,

    function (req, res){

        logger.warn("/api route was accessed, not implemented.");
        res.status(404);
        res.json(null);

        return;

    }

  );

  router.get('/api/queries',

    data.middleware.verifyAuth,

    function ( req, res ){

        try{

            data.models.query.find({})
            .select( "_id title description executions user_id" )
            .exec(

                function ( err, queries ){


                    try{                    

                        if( err ){

                            logger.error("Error querying hubdb for queries: "+ util.inspect(err, false, null));
                            res.status(500);
                            res.json(null);
                            return;

                        }

                        if( !queries || queries.length < 1 ){

                            res.status(204);
                            res.json(null);
                            return;

                        }else{

                            res.status(200); 
                            res.json({ queries : queries});

                        }

                    }catch(e){

                        logger.error("/api/queries caught an exception: "+ util.inspect(e, false, null));
                        res.status(500);
                        res.json(null);

                    }

                }



            );

        }catch(e){

            logger.error("/api/queries caught an exception: "+ util.inspect(e, false, null));
            res.status(500);
            res.json(null);

        }

    }

  );

    router.get('/api/processed_result',

        data.middleware.verifyAuth,
        function ( req, res ) {

            res.status(404);
            res.json(null);

        }

    );

    router.get(
        '/api/processed_result/:title',
        data.middleware.verifyAuth,
        function ( req, res ){

            try{

                data.models.query
                    .find({title:req.params.title})
                    .select("_id title description executions").exec(
                    function (err, queries) {

                        try{

                            if( err ){

                                logger.error("500: Error accessing the HubDB for " + req.params.title + " : "+ err);
                                res.status(500)
                                res.json(null);
                                return;

                            }else if( queries.length !== 1 ) {

                                logger.error("404: Not exactly one query with title: " + req.params.title);
                                res.status(404);
                                res.json(null);
                                return;

                            }else if ( !queries[0] || !queries[0].executions ){

                                logger.error("500: Invalid query object returned from HubDB for title: "+req.params.title);
                                res.status(500);
                                res.json(null);
                                return;

                            }else if ( queries[0].executions.length < 1 ){

                                logger.warn("204: No executions found for query: "+req.params.title);
                                res.status(204);
                                res.json(null);
                                return;

                            }

                            var exe = queries[0].executions[queries[0].executions.length - 1]

                            /************************/
                            /*FOR TESTING PURPOSES*/
                            //exe = require('../test/ratio.js').testData; 
                            /************************/

                            if( !exe ){

                                logger.warn("204: No query executions were found, returning empty object");
                                res.status(204);
                                res.json(null);
                                return; 

                            }

                            var rrm = RatioResultManager( req.session.user.clinician, JSON.parse(JSON.stringify(exe)) )

                            rrm.getFormattedData( 

                                function( result ){ 

                                    //we need all these nested try/catch blocks to due to async behaviour of JS. 
                                    try{                                    

                                        var rrm = RatioResultManager( req.session.user.clinician, JSON.parse(JSON.stringify(exe)) );

                                        result.network_id = "PDC";
                                        result.title = req.params.title; 
                                        result.description = queries[0].description;

                                        logger.debug(util.inspect(result,false,null));

                                        res.status(200);
                                        res.json( result )
                                        return; 

                                    }catch(e){

                                        logger.error("Caught and exception: "+util.inspect(e, false, null));
                                        res.status(500); 
                                        res.json(null);
                                        return;

                                    }

                                }

                            ); 

                        }catch(e){

                            logger.error("Caught and exception: "+util.inspect(e, false, null));
                            res.status(500); 
                            res.json(null);
                            return;

                        }

                    }

                );

            }catch(e){

                logger.error("Caught and exception: "+util.inspect(e, false, null));
                res.status(500); 
                res.json(null);
                return;

            }

        }

    );

    // Attach the router
    data.httpd.use('/', router);
    next(null, router);
}

// This task depends on `models` and `httpd` tasks.
module.exports = [ 'models', 'httpd', 'middleware', routes ];
