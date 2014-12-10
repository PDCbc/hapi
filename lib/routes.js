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

  router.get('/api/integrity/:title/:endpoint/:provider',
    function (req, res, next) { logger.error("Auth not implemented yet"); next(); },
    function (req, res, execution_ids) {
      fetch_executions_data(req, res, data, execution_ids, integrity1);
    }
  );

  function integrity1(req, res, data, execution_ids)
  {
    data.models.query
      .find({title:req.params.title})
      .exec(
        function (err, queries) {

          var keyable_aggregate_results = [];
          var raw_results = {};
          raw_results.network = [];
          raw_results.clinic = {};
          raw_results.provider = [];
          var key = null;
          var execution_ids = [];

          var processed_results = {};
          processed_results.query = {key:req.params.title};
          processed_results.network = [];
          processed_results.clinic = [];
          processed_results.provider = [];

          for(var i=0; i<queries.length; i++)
          {
            for(var j=0; j<queries[i].executions.length; j++)
            {
              keyable_aggregate_results.push( queries[i].executions[j].aggregate_result.toJSON() );
              execution_ids.push(queries[i].executions[j]._id);

              for(var k=0; k<keyable_aggregate_results.length; k++)
              {
                for(var property in keyable_aggregate_results[k])
                {
                  if(keyable_aggregate_results[k].hasOwnProperty(property))
                  {
                    var aggregate_result = {};
                    aggregate_result[property] = keyable_aggregate_results[k][property];

                    if(property.indexOf("providerid")<0)
                    {
                      //network results
                      raw_results.network.push(aggregate_result);

                      //clinic results
                      //first need to sort these by execution id ---
                      //will later use that to determine the endpoint id
                      if(raw_results.clinic[queries[i].executions[j]._id])
                      {
                        raw_results.clinic[queries[i].executions[j]._id].push(aggregate_result);
                      }
                      else
                      {
                        raw_results.clinic[queries[i].executions[j]._id] = [];
                        raw_results.clinic[queries[i].executions[j]._id].push(aggregate_result);
                      }
                    }
                    else if(property.indexOf("providerid") > -1)
                    {
                      //provider results
                      raw_results.provider.push(aggregate_result);
                    }
                  }
                }
              }

              var keys;
              var network_numerator = 0;
              var network_denominator = 0;

              //handle network results
              for(var z=0; z < raw_results.network.length; z++)
              {
                keys = Object.keys(raw_results.network[z]);
                network_numerator += ((raw_results.network[z][keys[0]] > 1) ? 1 : 0);
                network_denominator++;
              }


              var network_result = {};
              network_result = {};
              network_result.network = "PDC";
              network_result.date = new Date(queries[i].executions[j].time*1000);
              network_result.value = {numerator: network_numerator, denominator: network_denominator};

              processed_results.network.push(network_result);

              //handle provider results
              var provider_result = {};

              provider_result.execution = queries[i].executions[j]._id;
              provider_result.provider = req.params.provider;
              provider_result.date =
                new Date(queries[i].executions[j].time*1000);//Close approximaion to the truth if queries
                                                            //take a small fraction of a day to run.
                                                            //Alternative is to choose the greatest
                                                            //date in the executions - that would lead
                                                            //to an ugly graph
              provider_result.value = {"numerator":0, "denominator":0};
              delete provider_result.execution;
              processed_results.provider.push(provider_result);

              for(var x=0; x < raw_results.provider.length; x++)
              {
                keys = Object.keys(raw_results.provider[x]);
                var provider = keys[0].substr(keys[0].indexOf("providerid_") + "providerid_".length);

                if( provider == req.params.provider)
                {
                  //denominator
                  provider_result.value.denominator++;
                  //numerator
                  if(raw_results.provider[x][keys[0]] > 1)
                  {
                    provider_result.value.numerator++;
                  }
                }
              }//for providers
            }
          }

          //handle clinic results
          var clinic_numerator = 0;
          var clinic_denominator = 0;

          data.models.result.find({execution_id: {$in:execution_ids}, endpoint: req.params.endpointid})
            .select("_id endpoint_id execution_id updated_at").exec(
            function(err, results)
            {
              //raw_results.clinic[queries[i].executions[j]._id].push(aggregate_result);

              processed_results.clinic = [];
              var raw_execution_results;
              var raw_results_sorted_by_endpoint = {};

              //label with endpoint and sort

              for(var y=0; y<execution_ids.length; y++)
              {
                raw_execution_results = raw_results.clinic[execution_ids[y]];

                raw_results_sorted_by_endpoint[results[y].endpoint_id] = [];

                var result = {};
                result.endpoint_id = results[y].endpoint_id;
                result.date = new Date(results[y].updated_at);
                result.value = {};
                result.value.numerator = 0;
                result.value.denominator = 0;
                processed_results.clinic.push(result);

                for(var w=0; w<raw_results.clinic[execution_ids[y]].length; w++)
                {

                  keys = Object.keys(raw_results.clinic[execution_ids[y]][w]);

                  if(raw_results.clinic[execution_ids[y]][w][keys[0]] > 1)
                  {
                    processed_results.clinic[y].value.numerator++;
                  }

                  processed_results.clinic[y].value.denominator++;
                }
              }

              res.json( { processed_results: processed_results } );
            }
          );
        }
      );
  }

  router.get('/api/integrity2/:title/:endpoint/:provider/:months',
    function (req, res, next) { logger.error("Auth not implemented yet"); next(); },
    function (req, res) {

      var ticks = [];
      for(var a=0; a<req.params.months; a++)
      {
          ticks.push({tick_end: new Date(2012, a), values:[]});
      }

      data.models.query.find({title:req.params.title}).exec(
        function(err, queries)
        {
          var executions = [];

          for(var i=0; i<queries.length; i++)
          {
            for(var j=0; j<queries[i].executions.length; j++)
            {
              executions.push(queries[i].executions[j]._id);
            }
          }

          data.models.result.find({execution_id:{$in:executions}}).exec(
            function(err, results)
            {

              var dob_admit_pairs_result = [];
              for(var i=0; i<results.length; i++)
              {
                var values = results[i].value.toJSON();
                var value_keys = Object.keys(values);

                var dob_admit_pairs = [];

                for(var k=0; k<value_keys.length; k++)
                {
                  var key = value_keys[k];

                  if(key.indexOf("birthtime") === 0)//all emitted fields - exclude query_id, created_at, _id, etc.
                  {
                    var kvps = key.split('_');

                    var dob_admit_pair = {};
                    dob_admit_pair.dob = !isNaN( new Date(kvps[1]).getTime()) ? new Date(kvps[1]):undefined;
                    dob_admit_pair.admit = !isNaN( new Date(kvps[3]).getTime()) ? new Date(kvps[3]):undefined;
                    dob_admit_pair.value = values[key];
                    dob_admit_pair.result_id = results[i]._id;
                    dob_admit_pair.endpoint = req.params.endpoint;
                    dob_admit_pair.provider = req.params.provider;
                    dob_admit_pairs.push(dob_admit_pair);
                  }
                }

                //want a set of results
                //once a month for the last two years
                //on the first of that month what is the duplicate rate

                //sort by admit date ---
                //if they have been to the clinic then the admit date has passed

                dob_admit_pairs = dob_admit_pairs.sort(propComparator("admit"));

                var tick_count = 0;

                //cluster by tick
                for(var m=0; m<dob_admit_pairs.length;m++)
                {
                  var admit = dob_admit_pairs[m].admit;


                  if(new Date(admit) > new Date(ticks[tick_count].tick_end))
                  {
                    tick_count++;
                  }

                  for(var n=req.params.months-1; n>=tick_count; n--)
                  {
                    ticks[n].values.push(dob_admit_pairs[m]);
                  }
                }

                for(var temp1=0; temp1<ticks.length; temp1++)
                {
                  ticks[temp1].values = ticks[temp1].values.sort(propComparator("dob"));
                }

                for(var p=0; p<ticks.length; p++)
                {
                  ticks[p].network = {};
                  ticks[p].network.PDC = {};
                  ticks[p].network.PDC.values = [];
                  ticks[p].network.PDC.numerator=0;
                  ticks[p].network.PDC.denominator=0;
                  ticks[p].clinic = {};
                  ticks[p].provider = {};

                  for(var q=0; q<ticks[p].values.length; q++)
                  {
                    //network
                    ticks[p].network.PDC.values.push(ticks[p].values[q]);

                    //clinic
                    if(!ticks[p].clinic[ticks[p].values[q].endpoint])
                    {
                      ticks[p].clinic[ticks[p].values[q].endpoint] = {};
                      ticks[p].clinic[ticks[p].values[q].endpoint].values = [];
                    }

                    ticks[p].clinic[ticks[p].values[q].endpoint].values.push(ticks[p].values[q]);

                    //provider
                    if(!ticks[p].provider[ticks[p].values[q].provider])
                    {
                      ticks[p].provider[ticks[p].values[q].provider] = {};
                      ticks[p].provider[ticks[p].values[q].provider].values = [];
                    }

                    ticks[p].provider[ticks[p].values[q].provider].values.push(ticks[p].values[q]);
                  }
                }

                //cluster by value and reduce
                for(var r=0; r<ticks.length; r++)
                {
                  ticks[r].network.PDC.values = ticks[r].network.PDC.values.sort( propComparator("dob") );

                  clusterByValue(ticks[r], "network", "PDC", "dob");


                  var clinicKeys = Object.keys(ticks[r].clinic);

                  for(var s=0; s<clinicKeys.length; s++)
                  {
                    ticks[r].clinic[clinicKeys[s]].values.sort( propComparator("dob") );
                    clusterByValue(ticks[r], "clinic", clinicKeys[s], "dob");
                  }

                  var providerKeys = Object.keys(ticks[r].provider);

                  for(var x=0; x<providerKeys.length; x++)
                  {
                    ticks[r].provider[providerKeys[x]].values.sort( propComparator("dob") );
                    clusterByValue(ticks[r], "provider", providerKeys[x], "dob");
                  }
                }


                for(var t=0; t<ticks.length; t++)
                {
                  //network
                  reduce(ticks[t], "network", "PDC");
                  console.log("network");
                  console.log(ticks[t].network.PDC);

                  //clinic
                  var clinics = Object.keys(ticks[t].clinic);

                  for(var v=0; v<clinics.length; v++)
                  {
                    reduce(ticks[t], "clinic", clinics[v]);
                    console.log("clinic");
                    console.log(ticks[t].clinic[clinics[v]]);
                  }

                  //provider
                  var providers = Object.keys(ticks[t].provider);

                  for(var y=0; y<providers.length; y++)
                  {
                    reduce(ticks[t], "provider", providers[y]);
                    console.log("provider");
                    console.log(ticks[t].provider[providers[y]]);
                  }
                }

                dob_admit_pairs_result.push(dob_admit_pairs);
              }

              res.json( {integrity2:"integrity2 result"} );
            }
          );
        }
      );
    }
  );

  function reduce(tick, set, subset)
  {
    //keys
    var keys = Object.keys(tick[set][subset].clusteredValues).sort(sortByDateWithUndefinedStrings);

    //reduce
    tick[set][subset].numerator = 0;
    tick[set][subset].denominator = 0;

    for(var u=0; u<keys.length; u++)
    {
      tick[set][subset].numerator++;
      if(tick[set][subset].clusteredValues[keys[u]].count >1)tick[set][subset].denominator++;
    }

    delete tick[set][subset].values;
    delete tick[set][subset].clusteredValues;
  }

  function clusterByValue(tick, set, subset, field)
  {
    tick[set][subset].clusteredValues = {};
    var previousValue = null;

    for(var s=0; s<tick[set][subset].values.length; s++)
    {
      if(!previousValue || previousValue[field] === undefined ||
        (new Date(tick[set][subset].values[s][field]) > new Date(previousValue[field])) ||
        (new Date(tick[set][subset].values[s][field]) < new Date(previousValue[field])))
      {
        tick[set][subset].clusteredValues[tick[set][subset].values[s][field]] = {count:1};
      }
      else
      {
        //special undefined case
        if(tick[set][subset].values[s][field] === undefined)
        {
          if(!tick[set][subset].clusteredValues['undefined'])
          {
            tick[set][subset].clusteredValues['undefined'] = {count:1};
          }
          else
          {
            tick[set][subset].clusteredValues['undefined'].count++;
          }
        }
        else
        {
          tick[set][subset].clusteredValues[tick[set][subset].values[s][field]].count++;
        }
      }

      previousValue = tick[set][subset].values[s];
    }
  }

  function propComparator(prop) {
    return function(a,b)
      {
        if(a[prop] === undefined && b[prop] === undefined) return 0;
        if(a[prop] === undefined) return -1;
        if(b[prop] === undefined) return 1;

        return new Date(b[prop]) < new Date(a[prop]) ?  1 // if b should come earlier, push a to end
                                : new Date(b[prop]) > new Date(a[prop]) ? -1 // if b should come later, push a to begin
                                : 0;
      };
  }

  function sortByDateWithUndefinedStrings(a,b)
  {
    if(a.indexOf("undefined") === 0 && a.indexOf("undefined") === 0) return 0;
    if(a.indexOf("undefined") === 0) return -1;
    if(b.indexOf("undefined") === 0) return 1;

    return new Date(b) < new Date(a) ?  1 // if b should come earlier, push a to end
                            : new Date(b) > new Date(a) ? -1 // if b should come later, push a to begin
                            : 0;
  }

  function integrity2(req, res, data, start, end, ticks)
  {
    res.json( {integrity2:"integrity2 result"} );
  }

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

function tack_on_endpointid_and_continue(req, res, data, execution_id)
{

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
        // Make this a local var!
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

              //date for executions is reported in microseconds not milliseconds so we need to convert
              data.models.processed_result.network.push(
                {time: new Date(queries[i].executions[j].time*1000).toDateString(),
                  aggregate_result:aggregate_result});
            }
          }
        }

        res.json(
          { processed_result:data.models.processed_result,
            network_id:"PDC",
            endpoint_id: req.params.endpoint,
            provider_id: req.params.provider});

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

      fetch_clinic_data(req, res, data, execution_ids);
    }
  );
}

//547376f6410804c6f7000003
//45567

// This task depends on `models` and `httpd` tasks.
module.exports = [ 'models', 'httpd', routes ];
