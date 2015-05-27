'use strict';
var async = require('async'),
    _ = require('lodash'),
    logger = require('./logger').Logger('routes', 1);

var util = require('util');
var groupManager = require('./groups')


var groups = groupManager.groups; 

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
    function (req, res)
    {
      res.json({instructions:"read the source code and documentation"});
      return;
    }
  );

  router.get('/api/queries/:title',
    data.middleware.verifyAuth,
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
    data.middleware.verifyAuth,
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
    data.middleware.verifyAuth,
    function (req, res)
    {
      res.json( {instructions:"query title required"} );
    }
  );

  router.get('/api/processed_result/:title',
    data.middleware.verifyAuth,
    function (req, res)
    {

      res.result = {};
      fetch_data(req, res, data);
    }
  );

  // Attach the router
  data.httpd.use('/', router);
  next(null, router);
}

var levels = ['clinician', 'group', 'network'];
var filters = {clinician:clinicianFilter, group:groupFilter, network:networkFilter};

function clinicianFilter(req, group, fields)
{
  return fields[1] === req.session.user.clinician;
}

function groupFilter(req, group, fields)
{
  if(!group){

    return false; 

  }
  logger.log('group filter');
  logger.log('fields:');
  logger.log(util.inspect(fields, false, null));
  logger.log('pass: ');
  logger.log((group.members.indexOf(fields[1]) !== -1));
  return group.members.indexOf(fields[1]) !== -1;
}

function networkFilter(req, group, fields)
{
  return true;
}

function process(req, res, group, query_aggregate_result, level)
{
  var errorMessage;
  var result = {aggregate_result:{}};
  var keys = Object.keys(query_aggregate_result);


  keys.forEach(
    function(key)
    {

      var fields = key.split('_');
      var allowedVals = ['numerator', 'denominator', 'time'];

      if(allowedVals.indexOf(fields[0]) === -1)
      {
        errorMessage = 'invalid emit detected: ' + fields[0];
        logger.error(errorMessage);
        res.json({error:errorMessage});
        return;
      }

      if(fields[0] !== 'time')
      {

        if(filters[level](req, group, fields))
        {
          logger.log('fields[0]: ' + fields[0]);
          logger.log('result: ');
          logger.log(util.inspect(result));
          logger.log('result there: ' + result.aggregate_result[fields[0]]);

          if(result.aggregate_result[fields[0]])
          {
            if(level==='clinician')
            {
              errorMessage = 'two emits for same provider - aggregating: QUERY: ' + req.params.title + ' PROVIDER: ' + req.session.user.clinician;
              logger.warn(errorMessage);
            }

            result.aggregate_result[fields[0]] += query_aggregate_result[key];
          }
          else
          {
            result.aggregate_result[fields[0]] = query_aggregate_result[key];
          }
        }
      }
    }
  );

  result.time = query_aggregate_result.time;
  res.result[level].push(result);

  logger.log(level + ' result:' + util.inspect(result, false, null));

}

function fetch_data(req, res, data)
{
  data.models.query
    .find({title:req.params.title})
    .select("_id title description executions").exec(
      function (err, queries) {

        var errorMessage;

        if(err)
        {
          logger.error(err);
          res.status(500).json({error:err});
          return;
        }

        if(queries.length !== 1)
        {
          errorMessage = "Not exactly one query with title: " + req.params.title;
          logger.error(errorMessage);
          res.status(500).json({error:errorMessage});
          return;
        }

        var group = null;

        logger.debug("fetch_data("+req.params.title+") for clinician: "+ req.session.user.clinician);

        groups.forEach(
          function(x){

            if(x.members.indexOf(req.session.user.clinician) !== -1)
            {
              group = x;
            }
          }
        );

        if(group === null)
        {
          errorMessage = "User has no group for query: "+req.params.title;
          logger.error(errorMessage);
          res.status(500).json({error:errorMessage});
          return;
        }

        var query = queries[0];
        res.result.clinician = [];
        res.result.group = [];
        res.result.network = [];

        query.executions.forEach(
          function(x)
          {
            var aggregate_result = {};
            aggregate_result.numerator = 0;
            aggregate_result.denominator = 0;

            var query_aggregate_result = JSON.parse(JSON.stringify(x.aggregate_result.toObject()));
            query_aggregate_result.time = new Date(x.time * 1000).toDateString();

            levels.forEach(
              function(level)
              {
                process(req, res, group, query_aggregate_result, level);
              }
            );
          }
        );

        logger.log('RESULT: ' + util.inspect(res.result, false, null));
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

// This task depends on `models` and `httpd` tasks.
module.exports = [ 'models', 'httpd', 'middleware', routes ];
