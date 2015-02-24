'use strict';
var async = require('async'),
_ = require('lodash'),
logger = require('./logger');

var util = require('util');
var request = require('request');
/**
* Sets up the standard routes for the application. Check the express documentation on routers.
* @param  {Function} next The async callback. Signature (error, result)
* @param  {Object}   data Contains results of the `models` and `httpd` task.
*/
function medclass_routes(next, data) {
  var router = new require('express').Router();
  var execution_ids = [];

//toni - 54d147f6f2ba326114000002 doc - 45567
//oscar - 54dd2e05f2ba32971f000014 doc -
  router.route('/:clinic/:clinician').get(
    function (req, res)
    {
      fetch_medclass_execution_data(req, res, data, mapReduceKeys, 'clinician', clinic);
    }
  );

  function fetch_medclass_execution_data(req, res, data, callback, stage)
  {
    data.models.query.find({title:'PDC-055'}).exec(
        function (err, queries)
        {
          queries.forEach(
            function (x)
            {
              execution_ids.push(x.executions[x.executions.length-1]._id);//only most recent execution
            });

          if(callback)
          {
            callback(req, res, data, function (fields) {return fields[2]===req.params.clinician;}, 'clinician', clinic);
          }
        });
  }

  function clinic(req, res, data, filter, segment)
  {
    mapReduceKeys(req, res, data, function (fields){ return true;}, 'clinic', network);
  }

  function network(req, res, data, filter, segment)
  {
    mapReduceKeysForNetwork(req, res, data,
      function ()
      {
        transformForNetwork(req, res, data, res.result,
          function()
          {
            res.json(res.result);
          });
      });
  }

  function transformForNetwork(req, res, data, result, callback)
  {
    var clinicianCodes = [];
    Object.keys(result.clinician).forEach(
      function(x)
      {
        var entry = {};
        entry[x] = result.clinician[x];
        entry.clinician = req.params.clinician;
        clinicianCodes.push(entry);
      }
    );

    var clinicCodes =[];
    Object.keys(result.clinic).forEach(
      function(x)
      {
        var entry = {};
        entry[x] = result.clinic[x];
        entry.clinic = req.params.clinic;
        clinicCodes.push(entry);
      }
    );

    var networkCodes =[];
    Object.keys(result.network).forEach(
      function(x)
      {
        var entry = {};
        entry[x] = result.network[x];
        networkCodes.push(entry);
      }
    );

    var codes = [clinicianCodes, clinicCodes, networkCodes];

    codes.forEach(
      function(x)
      {
        x.sort(sortDrugClasses);
      }
    );

    clinicianCodes = clinicianCodes.slice(0,10);//top ten by clinician

    var tempClinicCodes = [];
    var foundKeyInClinicCodes;

    var tempNetworkCodes = [];
    var foundKeyInNetworkCodes;

    clinicianCodes.forEach(
      function(clinicianCode)
      {
        foundKeyInClinicCodes = false;
        foundKeyInNetworkCodes = false;

        clinicCodes.forEach(
          function(clinicCode)
          {
            if(Object.keys(clinicianCode)[0] === Object.keys(clinicCode)[0])
            {
              tempClinicCodes.push(clinicCode);
              foundKeyInClinicCodes = true;
            }
          }
        );

        networkCodes.forEach(
          function(networkCode)
          {
            if(Object.keys(clinicianCode)[0] === Object.keys(networkCode)[0])
            {
              tempNetworkCodes.push(networkCode);
              foundKeyInNetworkCodes = true;
            }
          }
        );

        //have we added the key?
        if(!foundKeyInClinicCodes)
        {
          var clinicEntry = {};
          clinicEntry[Object.keys(clinicianCode)[0]] = 0;
          clinicEntry.clinic = req.params.clinic;
          tempClinicCodes.push(clinicEntry);
        }

        if(!foundKeyInNetworkCodes)
        {
          var networkEntry = {};
          networkEntry[Object.keys(clinicianCode)[0]] = 0;
          tempNetworkCodes.push(networkEntry);
        }
      }
    );

    clinicCodes = tempClinicCodes;
    networkCodes = tempNetworkCodes;

    var processed_result = {processed_result:{drugs:[], endpoint_id:req.params.clinic, provider_id:req.params.clinician }};

    for(var i=0; i<10; i++)
    {
      var entry = {};
      entry.drug_name = Object.keys(clinicianCodes[i])[0];
      entry.agg_data =[];

      var networkEntry = {};
      networkEntry.set = 'network';
      networkEntry.numerator = networkCodes[i][entry.drug_name];
      networkEntry.denominator = 100;
      entry.agg_data.push(networkEntry);

      var clinicEntry = {};
      clinicEntry.set = 'clinic';
      clinicEntry.numerator = clinicCodes[i][entry.drug_name];
      clinicEntry.denominator = 100;
      entry.agg_data.push(clinicEntry);

      var clinicianEntry = {};
      clinicianEntry.set = 'clinician';
      clinicianEntry.numerator = clinicianCodes[i][entry.drug_name];
      clinicianEntry.denominator = 100;
      entry.agg_data.push(clinicianEntry);

      processed_result.processed_result.drugs.push(entry);
    }

    res.result = processed_result;
    callback();
  }

  function sortDrugClasses(x, y)
  {
    return x[Object.keys(x)[0]] > y[Object.keys(y)[0]] ? -1 :
    y[Object.keys(y)[0]] > x[Object.keys(x)[0]] ? 1 : 0;
  }

  function mapReduceKeysForNetwork(req, res, data, callback)
  {
    data.models.query.find({title:'PDC-055'}).exec(
      function(err, queries)
      {
        if( err )
        {
          logger.error(err);
          return;
        }
        else if(queries.length != 1)
        {
          logger.error('not exactly 1 query with title PDC-055');
          return;
        }
        else
        {
          var query = queries[0];

          if(!query.executions)
          {
            logger.error('PDC-055: executions is false');
            return;
          }
          else if(query.executions.length < 1)
          {
              logger.error('PDC-055: no executions');
              return;
          }
          else
          {
            var execution = query.executions[query.executions.length-1];
            var value = JSON.parse(JSON.stringify(execution.aggregate_result));

            var codes = splitIntoCodes(execution, value, function(fields){return true;}, 'aggregate_result');

            mapReduceKeysSharedStage(res, req, data, function (fields) {return true;}, 'network', codes, callback);
          }
        }
      }
    );
  }

  var services = {'whoatc':'http://rxnav.nlm.nih.gov/REST/rxclass/class/byId.json?classId=',
                  'hc-din':null,
                  'fddbs':null};

  function splitIntoCodes(element, values, filter, field)
  {
    var codes = [];

    for( var y in values )
    {
      var fields = y.split('_');

      if(filter(fields))
      {
        var code = {};
        code[fields[0]] = element[field].toJSON(JSON.stringify(element[field]))[y];
        code.service = services[fields[1]];
        codes.push(code);
      }
    }

    return codes;
  }

  function mapReduceKeys(req, res, data, filter, segment, callback)
  {
    data.models.result.find({execution_id: {$in : execution_ids}, endpoint_id: req.params.clinic}).exec(
      function(err, results)
      {

        if(err)
        {
          logger.error(err);
          return;
        }
        else if(!results)
        {
          logger.error('results not defined');
          return;
        }
        else if(results.length<1)
        {
          logger.error('no results');
          return;
        }
        else
        {

          results = results.slice(-1);//take last execution only
          var result = results[results.length-1];

          var value = result.value.toJSON(JSON.stringify(result.value));

          var codes = splitIntoCodes(result, value, filter, 'value');

          mapReduceKeysSharedStage(res, req, data, filter, segment, codes, callback);
        }
      });
  }

  function mapReduceKeysSharedStage(res, req, data, filter, segment, codes, callback)
  {
    async.map(codes,
      function (x, callback)
      {
        var keys = Object.keys(x);

        var codeValue = keys[0];
        var className;

        if(x.service)
          {
            request.get({ url: x.service + keys[0], json: true },
              function (error, request, body)
              {
                if(error)
                  {
                    logger.error(error);
                    callback(error, x);
                    return;
                  }

                  className = body.rxclassMinConceptList.rxclassMinConcept[0].className;
                  x[className] = x[keys[0]];
                  delete x[keys[0]];
                  delete x.service;

                  callback(null, x);
                });
              }
              else
                {
                  delete x.service;
                  callback(null, x);
                }
              },
              function(err, results)
              {
                if(err)
                {
                  logger.error(err);
                  return;
                }
                else
                {
                  codes = results;

                  codes = codes.reduce(
                    function(previousValue, currentValue, index, array)
                    {
                      var key = Object.keys(currentValue)[0];

                      var result = previousValue;

                      if(result[key] === null || result[key] === undefined)
                      {
                        result[key] = currentValue[key];

                        for(var i=index+1; i<array.length; i++)
                        {
                          if(array[i][key])
                          {
                            result[key] += array[i][key];
                          }
                        }
                      }
                      return result;
                    }, {}
                  );

                  if(!res.result)
                  {
                    res.result = {};
                  }

                  //drop hquery stuff
                  delete codes[''];
                  delete codes.query;
                  delete codes.created;

                  res.result[segment] = codes;
                  callback(req, res, data, filter, segment);
                }
              });
  }

  // Attach the router
  data.httpd.use('/medclass', router);
  next(null, router);
}

// This task depends on `models` and `httpd` tasks.
module.exports = [ 'models', 'httpd', medclass_routes ];