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
function demographic_routes(next, data) {

  var router = new require('express').Router();

  router.route('/').get(
    function(req, res, next){
      res.json({happy:1});
    }
  );

  router.route('/:endpoint/:provider').get(
    function(req, res, next){
      logger.error("Auth not implemented yet"); next();
    },
    function(req,res)
    {
      res.result = {};
      fetch_demographics_executions_data(req, res, data, fetch_provider_demographic_data);
    }
  );

  data.httpd.use('/demographics', router);
  next(null, router);
}

function fetch_demographics_executions_data(req, res, data, callback)
{
  data.models.query
  .find({title:'Demographics-PDC-001'})
  .select("_id executions")
  .exec(
    function (err, queries) {

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
  var network_result = {'female':'0','male':'0','undifferentiated':'0'};
  var aggregates;
  var matches = {'female':new RegExp('^female'), 'male':new RegExp('^male'), 'undifferentiated':new RegExp('^undifferentiated')};

  data.models.query
  .find({title:'PDC-001'})
  .select("_id endpoints executions")
  .exec(
    function (err, queries) {
      _.each(queries, iterateOverQueryExecutions );

      function iterateOverQueryExecutions( query )
      {
        _.each(query.executions, processExecution );

        function processExecution(execution)
        {
          aggregates = {'female':{},'male':{},'undifferentiated':{}};

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

  data.models.result.find({execution_id: {$in : execution_ids}, endpoint_id: req.params.endpoint})
  .select("value").exec(
    function (err, results) {

      if(results)
      {
        for(var i=0; i<results.length; i++)
        {
          clinic_result = {'female':{},'male':{},'undifferentiated':{}};

          if(results[i].value._id)//exclude empty values
          {
            res.result.clinic.push(clinic_result);

            var matches = {'female':new RegExp('^female'), 'male':new RegExp('^male'), 'undifferentiated':new RegExp('^undifferentiated')};
            aggregates = {'female':{},'male':{},'undifferentiated':{}};

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

      fetch_network_demographic_data(req, res, data, execution_ids);
    }
  );

  function addAggregate(x)
  {
    clinic_result[x] = aggregates[x];
    return true;
  }
}

function fetch_provider_demographic_data(req, res, data, execution_ids)
{
  res.result.clinician = [];

  console.log('endpoint: ' + req.params.endpoint);
  console.log('provider: ' + req.params.provider);
  console.log('executions: ' + util.inspect(execution_ids));

  //
  data.models.result.find({execution_id: {$in : execution_ids}, endpoint_id: req.params.endpoint})
  .select("value").exec(
    function (err, results) {

      console.log('results: ' + util.inspect(results, false, null));

      if(results)
      {
        for(var i=0; i<results.length; i++)
        {
          var clinician_result = {};

          if(results[i].value._id)//exclude empty values
          {
            res.result.clinician.push(clinician_result);

            var matches = {'female':new RegExp('^female'), 'male':new RegExp('^male'), 'undifferentiated':new RegExp('^undifferentiated')};

            clinician_result.time = new Date(results[i].value.created_at).toDateString();

            for(var result in results[i].value.toJSON())
            {
              for(var match in matches)
              {
                if(matches[match].test(result))
                {
                  var fields = result.split('_');

                  if(fields.length == 3 && fields[2] == req.params.provider)
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

      fetch_clinic_demographic_data(req, res, data, execution_ids);
    }
  );
}

module.exports = [ 'models', 'httpd', demographic_routes ];
