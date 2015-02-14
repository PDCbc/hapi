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
      fetch_medclass_execution_data(req, res, data, fetch_clinician_data);
    }
  );

  function fetch_medclass_execution_data(req, res, data, callback)
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
            callback(req, res, data);
          }
        });
  }

  function fetch_network_data(req, res, data)
  {
    res.json({medclass:'hello world!'});
  }

  function fetch_clinic_data(req, res, data)
  {
    fetch_network_data(req, res, data);
  }

  function fetch_clinician_data(req, res, data)
  {
    function processCode(code, url, callback)
    {
      if(url === null)
      {
        logger.warn('code: ' + util.inspect(code) + ' has no associated service');
        callback();
        return;
      }

      var keys = Object.keys(code);

      if(keys.length != 1)
      {
          logger.error('a drug code element did not have one and only one code in it');
          callback();
          return;
      }

      var codeValue = keys[0];

      request.get({ url: url + codeValue, json: true }, function (error, request, body) {
        console.log('code : class -' + Object.keys(code)[0] + ':' + body.rxclassMinConceptList.rxclassMinConcept[0].className);

        //callback(error, request);
        callback();
      });


    }

    function processElements(element, callback)
    {
      async.each(element.codes,
        function (code, callback)
        {
          processCode(code, element.service, callback);
        }, function (){ callback(); });

    }

    function processedAllElements(err)
    {
      if(err){
        logger.log(err);
      }
      else
        {
          console.log('processed all series');
        }
    }

    function getCodes( a )
    {

      var keys = Object.keys(a);

      var elements = [];

      keys.forEach(
        function (x)
        {
          elements.push(a[x]);
        }
      );

      async.each(elements, processElements, processedAllElements);
    }

    console.log('fetch clinician data');

    data.models.result.find({execution_id: {$in : execution_ids}, endpoint_id: req.params.clinic}).exec(
      function (err, results)
      {
        if(err)
        {
          logger.error(err);
        }
        else if(!results)
        {
          logger.error('no results');
        }
        else
        {
          results = results.slice(-1);
          var x = results[results.length-1];

          var codeSets = {'whoatc':{'codes':[]}, 'hc-din':{'codes':[]}, 'fddbs':{codes:[]}};

          codeSets.whoatc.service = 'http://rxnav.nlm.nih.gov/REST/rxclass/class/byId.json?classId=';
          codeSets['hc-din'].service = null;
          codeSets.fddbs.service = null;

          var value = x.value.toJSON(JSON.stringify(x.value));

          for( var y in value )
          {
            var fields = y.split('_');

            if(fields[2]===req.params.clinician)
            {
              var entry = {};
              entry[fields[0]] = x.value.toJSON(JSON.stringify(x.value))[y];
              codeSets[fields[1]].codes.push(entry);
            }
          }

          getCodes(codeSets);
        }
      });
  }

  // Attach the router
  data.httpd.use('/medclass', router);
  next(null, router);
}

// This task depends on `models` and `httpd` tasks.
module.exports = [ 'models', 'httpd', medclass_routes ];
