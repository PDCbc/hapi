'use strict';
var async = require('async'),
    _ = require('lodash'),
    logger = require('./logger');

/**
 * Sets up the standard routes for the application. Check the express documentation on routers.
 * @param  {Function} next The async callback. Signature (error, result)
 * @param  {Object}   data Contains results of the `models` and `httpd` task.
 */
function routes(next, data) {
  var router = new require('express').Router();
  var execution_ids = [];
  // Create a User.
  router.route('/user')
      .get(
          function (req, res, next) { logger.error("Auth not implemented yet"); },
          function (req, res) {
              return res.render('create', req.user);
          }
      )
      .post(
          function(req, res, next) { logger.error("Auth Not implemented yet"); },
          function create(req, res) {
              if (req.body.username && req.body.password) {
                  var user = new data.models.user({
                      username: req.body.username,
                      password: req.body.password
                  }).save(function (error) {
                      if (error) { return res.status(401).send('You didn\'t do it!'); }
                      return res.redirect('/auth?good');
                  });
              } else {
                  return res.status(401).send('More info needed');
              }
          }
      );

  // Login a User.
  router.route('/auth')
    .get(function (req, res) { res.render('login', req.user); })
    .post(function (req, res) { logger.error("Auth not implemented yet."); });

  // Log out.
  router.get('/auth/logout',
    function (req, res) {
      logger.error("Auth Not implemented yet.");
      res.redirect('/auto');
  });

  router.get('/api',
    function (req, res, next) { logger.error("Auth not implemented yet"); next(); },
    function (req, res) { res.json({instructions:"read the code and documentation"}); }
  );

  // A list of valid items to visualize.
  router.get('/api/queries',
      function (req, res, next) {
        logger.error("Auth not implemented yet"); next();
      },

      function (req, res) {
        data.models.query.find({})
                          .populate('user_id')
                          .select("_id title dexcription executions user_id")
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

  // Attach the router.
  data.httpd.use(router);
  next(null, router);
}

function fetch_executions_data(req, res, data, execution_ids, callback)
{
  data.models.query
    .find({title:req.params.title})
    .select("_id executions")
    .exec(
      function (err, queries) {

        var execution_ids = [];
        data.models.processed_result.network = [];

        for(var i=0; i<queries.length; i++)
        {
          for(var j=0; j<queries[i].executions.length; j++)
          {
            if(typeof queries[i].executions[j].aggregate_result.numerator !== 'undefined' &&
              typeof queries[i].executions[j].aggregate_result.denominator !== 'undefined')
            {
              execution_ids.push(queries[i].executions[j]._id);
            }
          }
        }

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
        data.models.processed_result.network = [];

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

              data.models.processed_result.network.push(
                {time: queries[i].executions[j].time,
                  aggregate_result:aggregate_result});
            }
          }
        }

        res.json({ processed_result:data.models.processed_result});

        data.models.processed_result = {};
      });
}

function fetch_clinic_data(req, res, data, execution_ids)
{
  data.models.processed_result.clinic = [];

  data.models.result.find({execution_id: {$in : execution_ids}, endpoint_id: req.params.endpoint})
                    .select("value").exec(
    function (err, results) {

      for(var i=0; i<results.length; i++)
      {
        if(results[i].value._id)//exclude empty values
        {
          //clinic data
          data.models.processed_result.clinic.push(
            {time: new Date(results[i].value.created_at).toDateString(),
              aggregate_result:
                {numerator: results[i].value.numerator,
                  denominator: results[i].value.denominator}
            }
          );
        }
      }

      data.models.processed_result.endpoint = req.params.endpoint;
      fetch_network_data(req, res, data, execution_ids);
    }
  );
}

function fetch_provider_data(req, res, data, execution_ids)
{
  data.models.processed_result.clinician = [];

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
          data.models.processed_result.clinician.push(
            {time: new Date(results[i].value.created_at).toDateString(),
              aggregate_result:
                {numerator: results[i].toJSON().value[clinician_numerator_key],
                  denominator: results[i].toJSON().value[clinician_denominator_key]}
            }
          );
        }
      }

      data.models.processed_result.provider = req.params.provider;
      fetch_clinic_data(req, res, data, execution_ids);
    }
  );
}

// This task depends on `models` and `httpd` tasks.
module.exports = [ 'models', 'httpd', routes ];

//546d0365ebca1fa333000003
//45567
