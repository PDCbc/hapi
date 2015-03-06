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

    .post(function (req, res) {

        data.models.user.find().exec(
          function(err, users)
          {
            if(err)
            {
              logger.error(err);
              res.status(500).json({error:err});
              return;
            }
            else
            {
              logger.success(users.length + ' users in the db');
            }
          }
        );

        data.models.user.findOne({ username: req.body.username }).exec(
          function (err, user)
          {
            if (!err && user) {
                user.comparePassword(req.body.password,
                  function (err, isMatch)
                  {
                    if (!err && isMatch)
                    {
                      user.roles(
                        function respond(err, roles)
                        {
                          if (err)
                          {
                            var errorMessage = 'No roles for ' + user.username + ' specified.';
                            logger.error(errorMessage);
                            //res.status(500).json({error:errorMessage});
                            //return;
                          }
                          // Downcast the Mongoose Document into an object so we can store things in it.
                          var wireRepresentation = user.toObject();
                          //hack for now
                          user.endpoint='54e65f059e586a7130000002';
                          user.provider='cpsid';
                          wireRepresentation.roles = roles;
                          res.json(wireRepresentation);
                          return;
                        });
                    }
                    else if (!isMatch)
                    {
                      res.status(401).json({error: "Wrong password or username."});
                      return;
                    } else {
                      res.status(401).json(err);
                      return;
                    }
                });
            }
            else if (!user)
            {
              var errorMessageA = "No user found.";
              logger.error(errorMessageA);
              res.status(401).json({error: errorMessageA});
              return;
            }
            else
            {
              var errorMessageB = "Unknown error. Check logs on hub-api.";
              logger.error(err);
              res.status(401).json({error: errorMessageB});
              return;
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
      logger.error("Auth not implemented yet");
      next();
    },

    function (req, res)
    {
      res.json({instructions:"read the source code and documentation"});
      return;
    }
  );

  router.get('/api/queries/:title',
    function (req, res, next)
    {
      logger.error("Auth not implemented yet");
      next();
    },

    function (req, res)
    {
      data.models.query.find({title:req.params.title})
                        .select("_id title description executions user_id").exec(
                          function (err, queries)
                          {
                            if(err)
                            {
                              res.status(500).json({error:err});
                              logger.error(err);
                              return;
                            }

                            if(queries.length != 1)
                            {
                              var errorMessage = 'not exactly one query with title: ' + req.params.title;
                              res.status(500).json({error:errorMessage});
                              logger.error(errorMessage);
                              return;
                            } else {
                              res.json({ queries:queries });
                              return;
                            }
                          });
    }
  );

  router.get('/api/queries',
    function (req, res, next)
    {
      logger.error("Auth not implemented yet");
      next();
    },

    function (req, res)
    {
      data.models.query.find({})
      .select("_id title description executions user_id")
      .exec(
        function (err, queries)
        {
          if(err)
          {
            logger.error(err);
            res.status(500).json({error:err});
            return;
          }
          res.json({ queries:queries});
        });
    }
  );

  router.get('/api/processed_result',
    function (req, res, next)
    {
      logger.error("Auth not implemented yet");
      next();
    },

    function (req, res)
    {
      res.json( {instructions:"query title required"} );
    }
  );

  router.get('/api/processed_result/:title/:endpoint/:provider',
    function (req, res, next)
    {
      logger.error("Auth Not implemented yet.");
      next();
    },

    function (req, res, execution_ids)
    {
      res.result = {};
      fetch_executions_data(req, res, data, execution_ids, fetch_provider_data);
    }
  );

  router.get('/api/processed_result/:title/:endpoint',
    function (req, res, next)
    {
      logger.error("Auth Not implemented yet.");
      next();
    },

    function (req, res, execution_ids)
    {
      res.result = {};
      fetch_executions_data(req, res, data, execution_ids, fetch_clinic_data);
    }
  );

  router.get('/api/processed_result/:title',
    function (req, res, next)
    {
      logger.error("Auth Not implemented yet.");
      next();
    },

    function (req, res)
    {
      res.result = {};
      fetch_network_data(req, res, data);
    }
  );

  // Attach the router
  data.httpd.use('/', router);
  next(null, router);
}

function fetch_executions_data(req, res, data, execution_ids, callback)
{
  data.models.query
    .find({title:req.params.title})
    .select("_id executions").exec(
      function (err, queries)
      {
        var errorMessage;

        if(err)
        {
          logger.error(err);
          res.status(500).json({error:err});
        }

        var execution_ids = [];

        data.models.processed_result.network = [];

        if(queries.length != 1)
        {
          errorMessage = 'there is not exactly 1 query for **' + req.params.title + '**';
          logger.error(errorMessage);
          res.status(500).json({error:errorMessage});
          return;
        }

        if(queries[0].executions === null || queries[0].executions===undefined)
        {
          errorMessage = 'query executions null or undefined for **' + req.params.title + '**';
          logger.error(errorMessage);
          res.status(500).json({error:errorMessage});
          return;
        }

        if(queries[0].executions.length<1)
        {
          errorMessage='no query executions for **' + req.params.title + '**';
          logger.error(errorMessage);
          res.status(500).json({error:errorMessage});
          return;
        }

        queries[0].executions.forEach(
          function (x)
          {
            if( typeof x.aggregate_result.denominator !== 'undefined')
            {
              execution_ids.push(x._id);
            }
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
    .select("_id endpoints executions description").exec(
      function (err, queries) {

        if(err)
        {
          logger.error(err);
          res.status(500).json({error:err});
          return;
        }

        var query = queries[0];
        res.result.network = [];

        for(var j=0; j<query.executions.length; j++)
        {
          if(typeof query.executions[j].aggregate_result.numerator !== 'undefined' &&
            typeof query.executions[j].aggregate_result.denominator !== 'undefined')
          {
            var aggregate_result = {};
            aggregate_result.numerator = query.executions[j].aggregate_result.numerator;
            aggregate_result.denominator = query.executions[j].aggregate_result.denominator;

            //date for executions is reported in microseconds not milliseconds so we need to convert
            res.result.network.push(
              {time: new Date(query.executions[j].time*1000).toDateString(),
                aggregate_result:aggregate_result}
            );
          }
        }

        res.json(
          { processed_result:
              res.result,
              network_id:"PDC",
              endpoint_id: req.params.endpoint,
              provider_id: req.params.provider,
              title: req.params.title,
              description: query.description
          });

        return;
      });
}

function fetch_clinic_data(req, res, data, execution_ids)
{
  res.result.clinic = [];

  data.models.result.find({execution_id: {$in : execution_ids}, endpoint_id: req.params.endpoint})
                    .select("value").exec(
    function (err, results) {

      if(err)
      {
        logger.error(err);
        res.status(500).json({error:err});
        return;
      }

      for(var i=0; i<results.length; i++)
      {
        if(results[i].value._id)//exclude empty values
        {
          //clinic data
          res.result.clinic.push(
            {time: new Date(results[i].value.created_at).toDateString(),
              aggregate_result:
                {numerator: results[i].value.numerator,
                  denominator: results[i].value.denominator}
            }
          );
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

      var errorMessage;

      if(err)
      {
        logger.error(err);
        res.status(500).json({error:err});
        return;
      }

      if(results === null || results ===undefined)
      {
        errorMessage = 'results null or undefined';
        logger.error(errorMessage);
        res.status(500).json({error:errorMessage});
        return;
      }

      if(results.length < 1)
      {
        errorMessage = 'no results';
        logger.error(errorMessage);
        res.status(500).json({error:errorMessage});
        return;
      }

      var clinician_numerator_key = "numerator_" + req.params.provider;
      var clinician_denominator_key = "denominator_" + req.params.provider;

      for(var i=0; i<results.length; i++)
      {

        if(results[i].value._id)//exclude empty values
        {
          //clinican data
          res.result.clinician.push(
            {time: new Date(results[i].value.created_at).toDateString(),
              aggregate_result:
                {numerator: results[i].toJSON().value[clinician_numerator_key],
                  denominator: results[i].toJSON().value[clinician_denominator_key]}
            }
          );
        }
      }

      fetch_clinic_data(req, res, data, execution_ids);
    }
  );
}

// This task depends on `models` and `httpd` tasks.
module.exports = [ 'models', 'httpd', routes ];
