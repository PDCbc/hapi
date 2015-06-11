'use strict';
var async = require('async'),
_ = require('lodash'),
logger = require('./logger').Logger('demographic_routes', 1);

var util = require('util');

/**
* Sets up the standard routes for the application. Check the express documentation on routers.
* @param  {Function} next The async callback. Signature (error, result)
* @param  {Object}   data Contains results of the `models` and `httpd` task.
*/
function demographic_routes(next, data) {

  var router = new require('express').Router();
  var auth = require('./auth');

  router.route('/').get(
    data.middleware.verifyAuth,
    function(req, res, next){
      res.result = {};
      fetch_demographics_executions_data(req, res, data, fetch_network_demographic_data);
    }
  );

  router.route('/:clinic').get(
    data.middleware.verifyAuth,//should check that the user matches the requested clinic
    function(req, res, next){
      res.result = {};
      fetch_demographics_executions_data(req, res, data, fetch_clinic_demographic_data);
    }
  );

  router.route('/:clinic/:clinician').get(
    data.middleware.verifyAuth,
    function(req,res)
    {
      res.result = {};
      fetch_demographics_executions_data(req, res, data, fetch_clinician_demographic_data);
    }
  );

  data.httpd.use('/demographics', router);
  next(null, router);
}

function fetch_demographics_executions_data(req, res, data, callback)
{
  data.models.query
  .find({title:'PDC-001'})
  .select("_id executions")
  .exec(
    function (err, queries) {
      if(err)
      {
        logger.error(err);
        res.status(500).json({error:err});
        return;
      }

      var execution_ids = [];

      for(var i=0; i<queries.length; i++)
      {
        for(var j=0; j<queries[i].executions.length; j++)
        {
          execution_ids.push(queries[i].executions[j]._id);
        }
      }

      if(callback)
      {
        callback(req, res, data, execution_ids);
      }
    }
  );
}

function fetch_network_demographic_data(req, res, data, execution_ids)
{
  res.result.network = [];
  var network_result = {'female':0,'male':0,'undifferentiated':0, 'undefined': 0};
  var aggregates;
  var matches = {'female':new RegExp('^female'), 'male':new RegExp('^male'), 'undifferentiated':new RegExp('^undifferentiated'), 'undefined':new RegExp('^undefined')};

  data.models.query
  .find({title:'PDC-001'})
  .select("_id endpoints executions")
  .exec(
    function (err, queries) {
      if(err)
      {
        logger.error(err);
        res.status(500).json({error:err});
        return;
      }

      _.each(queries, iterateOverQueryExecutions );

      function iterateOverQueryExecutions( query )
      {
        _.each(query.executions, processExecution );

        function processExecution(execution)
        {
          aggregates = {'female':{},'male':{},'undifferentiated':{}, 'undefined':{}};

          for(var aggregate_result in execution.toJSON().aggregate_result)
          {
            processExecutionValue(aggregate_result);
          }

          network_result.time = new Date(execution.time*1000).toDateString();
          res.result.network.push(network_result);

          function processExecutionValue(aggregate_result)
          {
            for(var match in matches)
            {
              checkMatchAndProcess(match);
            }

            Object.keys(matches).every(addAggregate);

            function checkMatchAndProcess(match)
            {
              if(matches[match].test(aggregate_result))
              {
                var fields = aggregate_result.split('_');

                if(fields.length == 3)
                {
                  if(aggregates[match][fields[1]] === null ||
                    aggregates[match][fields[1]] === undefined)
                  {
                    aggregates[match][fields[1]] = execution.toJSON().aggregate_result[aggregate_result];
                  }
                  else
                  {
                    aggregates[match][fields[1]] += execution.toJSON().aggregate_result[aggregate_result];
                  }
                }
              }
            }
          }
        }
      }

      res.result.network = res.result.network.sort(sortByTime);
      res.json(res.result);
    }
  );

  function addAggregate(x)
  {
    network_result[x] = aggregates[x];
    return true;
  }
}

function fetch_clinic_demographic_data(req, res, data, execution_ids)
{
  res.result.clinic = [];
  var clinic_result;
  var aggregates;

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

      if(!results)
      {
        errorMessage = 'results is evaluates to false';
        logger.error(errorMessage);
        res.status(500).json({error:errorMessage});
        return;
      }
      else
      {
        for(var i=0; i<results.length; i++)
        {
          clinic_result = {'female':{},'male':{},'undifferentiated':{}, 'undefined':{}};

          if(results[i].value._id)//exclude empty values
          {
            res.result.clinic.push(clinic_result);

            var matches = {'female':new RegExp('^female'), 'male':new RegExp('^male'), 'undifferentiated':new RegExp('^undifferentiated'), 'undefined':new RegExp('^undefined')};
            aggregates = {'female':{},'male':{},'undifferentiated':{}, 'undefined':{}};

            clinic_result.time = new Date(results[i].value.created_at).toDateString();

            for(var result in results[i].value.toObject())
            {
              for(var match in matches)
              {
                if(matches[match].test(result))
                {
                  var fields = result.split('_');
                  if(fields.length == 3)
                  {

                    if(aggregates[match][fields[1]] === null ||
                      aggregates[match][fields[1]] === undefined)
                    {
                      aggregates[match][fields[1]] = results[i].value.toObject()[result];
                    }
                    else
                    {
                      aggregates[match][fields[1]] += results[i].value.toObject()[result];
                    }
                  }
                }
              }
            }

            Object.keys(matches).every(addAggregate);
          }
        }
      }

      res.result.clinic = res.result.clinic.sort(sortByTime);
      fetch_network_demographic_data(req, res, data, execution_ids);
    }
  );

  function addAggregate(x)
  {
    clinic_result[x] = aggregates[x];
    return true;
  }
}

function fetch_clinician_demographic_data(req, res, data, execution_ids)
{
  res.result.clinician = [];

  logger.log('clinic: ' + req.params.clinic);

  logger.log('clinician: ' + req.params.clinician);

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

      if(!results)
      {
        errorMessage = 'results evaluates to false';
        logger.error(errorMessage);
        res.status(500).json({error:errorMessage});
        return;
      }
      else
      {
        for(var i=0; i<results.length; i++)
        {
          var clinician_result = {};

          if(results[i].value._id)//exclude empty values
          {
            res.result.clinician.push(clinician_result);

            var matches = {'female':new RegExp('^female'), 'male':new RegExp('^male'), 'undifferentiated':new RegExp('^undifferentiated'), 'undefined':new RegExp('^undefined')};

            clinician_result.time = new Date(results[i].value.created_at).toDateString();

            for(var result in results[i].value.toJSON())
            {
              for(var match in matches)
              {
                if(matches[match].test(result))
                {
                  var fields = result.split('_');

                  if(fields.length == 3 && fields[2] == req.params.clinician)
                  {
                    if(!clinician_result[match])
                    {
                      clinician_result[match] = {};
                    }

                    clinician_result[match][fields[1]] = results[i].value.toJSON()[result];
                  }
                }
              }
            }
          }
        }
      }

      res.result.clinician = res.result.clinician.sort(sortByTime);

      fetch_clinic_demographic_data(req, res, data, execution_ids);
    }
  );
}

function sortByTime(a, b)
{
  return new Date(a.time) < new Date(b.time) ? -1 :
  new Date(a.time) > new Date(b.time) ? 1 : 0;
}

module.exports = [ 'models', 'httpd', 'middleware', demographic_routes ];
