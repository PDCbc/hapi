'use strict';
var async = require('async'),
    _ = require('lodash'),
    logger = require('./logger');

var util = require('util');

/**
 * Sets up the standard routes for the application. Check the express documentation on routers.
 * @param  {Function} next The async callback. Signature (error, result)
 * @param  {Object}   data Contains results of the `models` and `httpd` task.
 */
function routes(next, data) {
  var router = new require('express').Router();
  var execution_ids = [];

  // Login a User.
  router.route('/auth')
    .get(function (req, res) {
      res.render('login', req.user);
      })
    .post(function (req, res) {
        data.models.user.findOne({ username: req.body.username }).exec(function (err, user) {
            if (!err && user) {
                user.comparePassword(req.body.password, function (err, isMatch) {
                    if (!err && isMatch) {
                        user.roles(function respond(err, roles) {
                            if (err) {
                                logger.error('No roles for ' + user.username + ' specified.');
                            }
                            // Downcast the Mongoose Document into an object so we can store things in it.
                            var wireRepresentation = user.toObject();
                            //hack for now
                            user.endpoint='54bea239ff60a6dd0c000002';
                            user.provider='45567';
                            wireRepresentation.roles = roles;
                            res.json(wireRepresentation);
                        });
                    } else if (!isMatch) {
                        res.status(401).json({error: "Wrong password or username."});
                    } else {
                        res.status(401).json(err);
                    }
                });
            } else if (!user) {
                res.status(401).json({error: "No user found."});
            } else {
                res.status(401).json({error: "Unknown error. Check logs on hub-api."});
                logger.error(err);
            }
        });
    });

  // Log out.
  router.get('/auth/logout',
    function (req, res) {
      res.redirect('/auto');
  });

  router.get('/api',
    function (req, res, next) {
      logger.error("Auth not implemented yet"); next(); },
    function (req, res) { res.json({instructions:"read the code and documentation"}); }
  );

  router.get('/api/queries/:title',
    function (req, res, next) {
      logger.error("Auth not implemented yet"); next();
    },

    function (req, res) {
      data.models.query.find({title:req.params.title})
                        .select("_id title description executions user_id")
                        .exec( function (err, queries) { res.json({ queries:queries}); } );
    }
  );

  router.get('/api/queries',
    function (req, res, next) {
      logger.error("Auth not implemented yet"); next();
    },

    function (req, res) {
      data.models.query.find({})
      .select("_id title description executions user_id")
      .exec( function (err, queries) { res.json({ queries:queries}); } );
    }
  );

  router.get('/api/processed_result',
    function (req, res, next) { logger.error("Auth not implemented yet"); next(); },
    function (req, res) { res.json( {instructions:"query title required"} ); }
  );

  router.get('/api/processed_result/:title/:endpoint/:provider',
    function (req, res, next) {
      logger.error("Auth Not implemented yet."); next();
    },

    function (req, res, execution_ids) {
      fetch_executions_data(req, res, data, execution_ids, fetch_provider_data);
    }
  );

  router.get('/api/processed_result/:title/:endpoint',
    function (req, res, next) {
      logger.error("Auth Not implemented yet."); next();
    },

    function (req, res, execution_ids) {
      fetch_executions_data(req, res, data, execution_ids, fetch_clinic_data);
    }
  );

//e.g., https://hubapi.scoop.local:8080/api/BMI?endpoint_id=XXXX
  router.get('/api/processed_result/:title',
    function (req, res, next) {
      logger.error("Auth Not implemented yet."); next();
    },

    function (req, res) {
      fetch_network_data(req, res, data);
    }
  );

  // Attach the router
  data.httpd.use('/', router);
  next(null, router);
}

function fetch_executions_data(req, res, data, execution_ids, callback)
{
  res.result = {};
  data.models.query
    .find({title:req.params.title})
    .select("_id executions")
    .exec(
      function (err, queries) {

        var execution_ids = [];
        data.models.processed_result.network = [];

        if(queries.length != 1)
        {
            logger.error('there is not 1 and only 1 query with the name ' + req.params.title);
            return;
        }

        queries[0].executions.every( function (x){
                                        if( typeof x.aggregate_result.denominator !== 'undefined')
                                        {
                                          execution_ids.push(x._id);
                                        }

                                        return true;
                                      });

        if(callback)
        {
          callback(req, res, data, execution_ids);
        }
      }
    );
}

function fetch_network_data(req, res, data)
{
  data.models.query
    .find({title:req.params.title})
    .select("_id endpoints executions")
    .exec(
      function (err, queries) {
        res.result.network = [];

        for(var i=0; i<queries.length; i++)
        {
          for(var j=0; j<queries[i].executions.length; j++)
          {
            if(typeof queries[i].executions[j].aggregate_result.numerator !== 'undefined' &&
              typeof queries[i].executions[j].aggregate_result.denominator !== 'undefined')
            {
              var aggregate_result = {};
              aggregate_result.numerator = queries[i].executions[j].aggregate_result.numerator;
              aggregate_result.denominator = queries[i].executions[j].aggregate_result.denominator;

              //date for executions is reported in microseconds not milliseconds so we need to convert
              if(aggregate_result.denominator !== 0)
              {
                res.result.network.push(
                  {time: new Date(queries[i].executions[j].time*1000).toDateString(),
                    aggregate_result:aggregate_result});
              }
            }
          }
        }

        res.json(
          { processed_result:
              res.result,
              network_id:"PDC",
              endpoint_id: req.params.endpoint,
              provider_id: req.params.provider,
              title: req.params.title
          });
      });
}

function fetch_clinic_data(req, res, data, execution_ids)
{
  res.result.clinic = [];

  data.models.result.find({execution_id: {$in : execution_ids}, endpoint_id: req.params.endpoint})
                    .select("value").exec(
    function (err, results) {

      for(var i=0; i<results.length; i++)
      {
        if(results[i].value._id)//exclude empty values
        {
          //clinic data
          if(results[i].toJSON().value.denominator !== 0)
          {
            res.result.clinic.push(
              {time: new Date(results[i].value.created_at).toDateString(),
                aggregate_result:
                  {numerator: results[i].value.numerator,
                    denominator: results[i].value.denominator}
              }
            );
          }
        }
      }

      fetch_network_data(req, res, data, execution_ids);
    }
  );
}

function fetch_provider_data(req, res, data, execution_ids)
{
  res.result.clinician = [];

  data.models.result.find({execution_id: {$in : execution_ids}, endpoint_id: req.params.endpoint})
                    .select("value").exec(
    function (err, results) {

      var clinician_numerator_key = "numerator_" + req.params.provider;
      var clinician_denominator_key = "denominator_" + req.params.provider;

      for(var i=0; i<results.length; i++)
      {
        if(results[i].value._id)//exclude empty values
        {
          //clinican data
          if(results[i].toJSON().value[clinician_denominator_key] !== 0)
          {
            res.result.clinician.push(
              {time: new Date(results[i].value.created_at).toDateString(),
                aggregate_result:
                  {numerator: results[i].toJSON().value[clinician_numerator_key],
                    denominator: results[i].toJSON().value[clinician_denominator_key]}
              }
            );
          }
        }
      }

      fetch_clinic_data(req, res, data, execution_ids);
    }
  );
}

// This task depends on `models` and `httpd` tasks.
module.exports = [ 'models', 'httpd', routes ];
