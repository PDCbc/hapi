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

  router.get('/api/processed_result/:title/:clinic/:clinician',
    data.middleware.verifyRequestMatchesSession,
    function (req, res, execution_ids)
    {
      res.result = {};
      fetch_executions_data(req, res, data, execution_ids, fetch_provider_data);
    }
  );

  router.get('/api/processed_result/:title/:clinic',
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

        var query = queries[0];

        if(query.executions === null || query.executions===undefined)
        {
          errorMessage = 'query executions null or undefined for **' + req.params.title + '**';
          logger.error(errorMessage);
          res.status(500).json({error:errorMessage});
          return;
        }

        if(query.executions.length<1)
        {
          errorMessage='no query executions for **' + req.params.title + '**';
          logger.error(errorMessage);
          res.status(500).json({error:errorMessage});
          return;
        }

        logger.warn("query: " + util.inspect(query, false, null));

        query.executions.forEach(
          function (x)
          {

            logger.log(util.inspect(x, false, null));

            if( x.aggregate_result )
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

        query.executions.forEach(
          function(x)
          {
            var aggregate_result = {};
            aggregate_result.numerator = 0;
            aggregate_result.denominator = 0;

            var query_aggregate_result = x.aggregate_result.toObject();

            Object.keys(query_aggregate_result).forEach(
              function (y)
              {
                var fields = y.split('_');

                if(fields[0] === 'denominator')
                {
                  aggregate_result.denominator += query_aggregate_result[y];
                }
                else if(fields[0] === 'numerator')
                {
                  aggregate_result.numerator += query_aggregate_result[y];
                }
              }
            );

            //date for executions is reported in microseconds not milliseconds so we need to convert
            res.result.network.push(
              {time: new Date(x.time*1000).toDateString(),
                aggregate_result:aggregate_result}
              );
          }
        );

        res.json(
          { processed_result:
              res.result,
              network_id:"PDC",
              endpoint_id: req.params.clinic,
              provider_id: req.params.clinician,
              title: req.params.title,
              description: query.description
          });

        return;
      });
}

function fetch_clinic_data(req, res, data, execution_ids)
{
  res.result.clinic = [];

  data.models.result.find({execution_id: {$in : execution_ids}, endpoint_id: req.params.clinic})
                    .select("value").exec(
    function (err, results) {

      if(err)
      {
        logger.error(err);
        res.status(500).json({error:err});
        return;
      }

      results.forEach(
        function(x)
        {
          var numerator=0;
          var denominator=0;

          if(x.value._id)//exclude empty values
          {
            var value = x.value.toObject();

            for(var key in value)
            {
              var fields = key.split('_');

              if(fields[0]==='numerator')
              {
                numerator+=value[key];
              }
              else if(fields[0]==='denominator')
              {
                denominator += value[key];
              }
            }

            //clinic data
            res.result.clinic.push(
              {time: new Date(x.value.created_at).toDateString(),
                aggregate_result:{
                    numerator: numerator,
                    denominator: denominator}
                });
          }
        }
      );

      fetch_network_data(req, res, data, execution_ids);
    }
  );
}

function fetch_provider_data(req, res, data, execution_ids)
{
  res.result.clinician = [];

  console.log("execution ids: " + execution_ids);

  data.models.result.find({execution_id: {$in : execution_ids}, endpoint_id: req.params.clinic})
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

      var clinician_numerator_key = "numerator_" + req.params.clinician;
      var clinician_denominator_key = "denominator_" + req.params.clinician;

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
module.exports = [ 'models', 'httpd', 'middleware', routes ];
