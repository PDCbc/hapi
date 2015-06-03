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

      res.json({instructions:"read the source code and documentation"});

      return;

    }

  );

  router.get('/api/queries/:title',
    data.middleware.verifyAuth,

    function (req, res){

        data.models.query.find({title:req.params.title})
        .select("_id title description executions user_id")
        .exec(

            function ( err, queries ){

                if( err ){

                    res.status(500).json({error:err});
                    logger.error(err);
                    return;

                }

                if( queries.length != 1 ){

                    var errorMessage = 'not exactly one query with title: ' + req.params.title;
                    res.status(500).json({error:errorMessage});
                    logger.error(errorMessage);
                    return;

                }else{

                  res.json({ queries:queries });
                  return;

                }

            }

        );

    }

  );

  router.get('/api/queries',
    data.middleware.verifyAuth,

    function ( req, res ){

        data.models.query.find({})
        .select( "_id title description executions user_id" )
        .exec(

            function ( err, queries ){

                if( err ){

                    logger.error(err);
                    res.status(500).json({error:err});
                    return;

                }

                res.json({ queries:queries});

            }

        );

    }

  );

  router.get('/api/processed_result',
    data.middleware.verifyAuth,
    function ( req, res ) {

      res.json( {instructions:"query title required"} );

    }

  );

    router.get(
        '/api/processed_result/:title',
        data.middleware.verifyAuth,
        function ( req, res ){

            data.models.query
                .find({title:req.params.title})
                .select("_id title description executions").exec(
                function (err, queries) {

                    var errorMessage;

                    if( err ){

                        logger.error(err);
                        res.status(500).json({error:err});
                        return;

                    }

                    if( queries.length !== 1 ) {

                        errorMessage = "Not exactly one query with title: " + req.params.title;
                        logger.error(errorMessage);
                        res.status(500).json({error:errorMessage});
                        return;

                    }

                    var exe = queries[0].executions[queries[0].executions.length - 1]

                    /************************/
                    /*FOR TESTING PURPOSES*/
                    //exe = require('../test/ratio.js').testData; 
                    /************************/

                    var rrm = RatioResultManager( req.session.user.clinician, JSON.parse(JSON.stringify(exe)) )

                    rrm.getFormattedData( 
                        function( result ){ 

                            result.network_id = "PDC";
                            result.title = req.params.title; 
                            result.description = queries[0].description;

                            res.json( result )

                        }
                    ); 

                }

            );

        }

    );

    // Attach the router
    data.httpd.use('/', router);
    next(null, router);
}

// This task depends on `models` and `httpd` tasks.
module.exports = [ 'models', 'httpd', 'middleware', routes ];
