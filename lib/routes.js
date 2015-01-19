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
  // TODO: Deprecate?
  // // Create a User.
  // router.route('/user')
  //     .get(
  //         function (req, res, next) { logger.error("Auth not implemented yet"); },
  //         function (req, res) {
  //             return res.render('create', req.user);
  //         }
  //     )
  //     .post(
  //         function(req, res, next) { logger.error("Auth Not implemented yet"); },
  //         function create(req, res) {
  //             if (req.body.username && req.body.password) {
  //                 // TODO: Should be `create` not new.
  //                 var user = new data.models.user({
  //                     username: req.body.username,
  //                     password: req.body.password
  //                 }).save(function (error) {
  //                     if (error) { return res.status(401).send('You didn\'t do it!'); }
  //                     return res.redirect('/auth?good');
  //                 });
  //             } else {
  //                 return res.status(401).send('More info needed');
  //             }
  //         }
  //     );

  // Login a User.
  router.route('/auth')
    .get(function (req, res) { res.render('login', req.user); })
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

  //45567
  //5488e93a4fe6347b54000018
  router.get('/api/demographics/:endpoint/:provider',
    function(req, res, next){
      logger.error("Auth not implemented yet"); next();
    },
    function(req,res)
    {
      res.result = {};
      fetch_demographics_executions_data(req, res, data, fetch_provider_demographic_data);
    }
  );

  function fetch_demographics_executions_data(req, res, data, callback)
  {
    data.models.query
    .find({title:'demographics'})
    .select("_id executions")
    .exec(
      function (err, queries) {

        var execution_ids = [];

        for(var i=0; i<queries.length; i++)
        {
          for(var j=0; j<queries[i].executions.length; j++)
          {
            if(typeof queries[i].executions[j].aggregate_result.denominator !== 'undefined')
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

  function fetch_network_demographic_data(req, res, data, execution_ids)
  {
    res.result.network = [];
    var network_result = {'female':'0','male':'0','undifferentiated':'0'};
    var aggregates;
    var matches = {'female':new RegExp('^female'), 'male':new RegExp('^male'), 'undifferentiated':new RegExp('^undifferentiated')};

    data.models.query
    .find({title:'demographics'})
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

    data.models.result.find({execution_id: {$in : execution_ids}, endpoint_id: req.params.endpoint})
      .select("value").exec(
        function (err, results) {

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
                          clinician_result[match] = [];
                        }

                        var value = {};
                        value[fields[1]] = results[i].value.toJSON()[result];

                        clinician_result[match].push(value);
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

  router.get('/api/integrity/:title/:endpoint/:provider/:months',
    function (req, res, next) { logger.error("Auth not implemented yet"); next(); },
    function (req, res) {

      var ticks = [];
      //push dates
      for(var a=req.params.months; a>0; a--)
      {
        var date = new Date();
        date.setMonth(date.getMonth() - a);
        ticks.push({tick_end: date, values:[]});
      }

      data.models.query.find({title:req.params.title}).exec(
        function(err, queries)
        {
          var execution = null;

          execution = queries[0].executions[queries[0].executions.length-1]._id;
            //should only have one query with a given name

          data.models.result.find({execution_id:execution}).exec(
            function(err, results)
            {
              var field_admit_pairs_result = [];
              for(var i=0; i<results.length; i++)
              {
                var values = results[i].value.toJSON();
                var value_keys = Object.keys(values);

                var field_admit_pairs = [];

                for(var k=0; k<value_keys.length; k++)
                {
                  var key = value_keys[k];

                  if(key.indexOf(req.params.title) === 0)
                  {
                    var kvps = key.split('_');
                    var field_admit_pair = {};
                    field_admit_pair[req.params.title] = kvps[1];
                    field_admit_pair.admit = kvps[3];
                    field_admit_pair.value = values[key];
                    field_admit_pair.result_id = results[i]._id;
                    field_admit_pair.endpoint = results[i].endpoint_id;
                    field_admit_pair.provider = kvps[5];
                    field_admit_pairs.push(field_admit_pair);
                  }
                }

                //sort by admit date ---
                //if they have been to the clinic then the admit date has passed

                field_admit_pairs = field_admit_pairs.sort(propComparator("admit"));

                var tick_count = 0;

                //cluster by tick
                for(var m=0; m<field_admit_pairs.length;m++)
                {
                  var admit = field_admit_pairs[m].admit;

                  if(new Date(admit) > new Date(ticks[tick_count].tick_end) && tick_count < ticks.length-2)
                  {
                    //odd cases may occur if query dates are manipulated - avoid overflows
                    tick_count++;
                  }

                  for(var n=req.params.months-1; n>=tick_count; n--)
                  {
                    ticks[n].values.push(field_admit_pairs[m]);
                  }
                }

                for(var temp1=0; temp1<ticks.length; temp1++)
                {
                  ticks[temp1].values = ticks[temp1].values.sort(propComparator(req.params.title));
                }

                for(var p=0; p<ticks.length; p++)
                {
                  ticks[p].network = {};
                  ticks[p].network.PDC = {};
                  ticks[p].network.PDC.values = [];
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

                //cluster by value
                for(var r=0; r<ticks.length; r++)
                {

                  ticks[r].network.PDC.values = ticks[r].network.PDC.values
                  .map(
                    function mapTitle(x)
                    {
                      return x[req.params.title] === null ? null :
                        isNaN(x[req.params.title]) ? x:x[req.params.title]*1;
                    }
                  ).sort( propComparator(req.params.title) );

                  clusterByValue(ticks[r], "network", "PDC", req.params.title);

                  var clinicKeys = Object.keys(ticks[r].clinic);

                  for(var s=0; s<clinicKeys.length; s++)
                  {
                    ticks[r].clinic[clinicKeys[s]].values.sort( propComparator(req.params.title) );
                    clusterByValue(ticks[r], "clinic", clinicKeys[s], req.params.title);
                  }

                  var providerKeys = Object.keys(ticks[r].provider);

                  for(var t=0; t<providerKeys.length; t++)
                  {
                    ticks[r].provider[providerKeys[t]].values.sort( propComparator(req.params.title) );
                    clusterByValue(ticks[r], "provider", providerKeys[t], req.params.title);
                  }
                }

                //reduce
                for(var u=0; u<ticks.length; u++)
                {
                  //network
                  reduce(ticks[u], "network", "PDC");


                  //clinic
                  var clinics = Object.keys(ticks[u].clinic);

                  for(var v=0; v<clinics.length; v++)
                  {
                    reduce(ticks[u], "clinic", clinics[v]);
                    //setDenominator(ticks[t], "clinic", clinics[v]);
                  }

                  //provider
                  var providers = Object.keys(ticks[u].provider);

                  for(var w=0; w<providers.length; w++)
                  {
                    reduce(ticks[u], "provider", providers[w]);
                    //setDenominator(ticks[t], "provider", providers[y]);
                  }
                }

                //set denominators
                //network
                setDenominator(ticks, "network", "PDC");

                for(var x=0; x<ticks.length; x++)
                {
                  if(!ticks[x].provider[req.params.provider])
                  {
                    ticks[x].provider[req.params.provider] = {aggregate_result:{numerator:0, denominator:0}};
                  }

                  //provider
                  var providers2 = Object.keys(ticks[x].provider);

                  for(var y=0; y<providers2.length; y++)
                  {
                    setDenominator(ticks, "provider", providers2[y]);
                  }

                  //clinic
                  var clinics2 = Object.keys(ticks[x].clinic);

                  for(var z=0; z<clinics2.length; z++)
                  {
                    setDenominator(ticks, "clinic", clinics2[z]);
                  }
                }

                setDenominator(ticks, "network", "PDC");

                field_admit_pairs_result.push(field_admit_pairs);
              }

              var response = {};
              response.network = [];
              response.clinic = [];
              response.clinician = [];
              response.network_id = "PDC";
              response.endpoint_id = req.params.endpoint;
              response.provider_id = req.params.provider;

              for(var zz=0; zz<ticks.length;zz++)
              {

                if(ticks[zz].network.PDC.aggregate_result.denominator !==0 )
                {
                  ticks[zz].network.PDC.time = ticks[zz].tick_end.toDateString();
                  response.network.push(ticks[zz].network.PDC);
                }

                if(ticks[zz].clinic[req.params.endpoint].aggregate_result.denominator !== 0)
                {
                  ticks[zz].clinic[req.params.endpoint].time = ticks[zz].tick_end.toDateString();
                  response.clinic.push(ticks[zz].clinic[req.params.endpoint]);
                }

                if(ticks[zz].provider[req.params.provider].aggregate_result.denominator !== 0)
                {
                  ticks[zz].provider[req.params.provider].time = ticks[zz].tick_end.toDateString();
                  response.clinician.push(ticks[zz].provider[req.params.provider]);
                }
              }

              response.title = req.params.title;
              res.json({processed_result:response});
            }
          );
        }
      );
    }
  );

  var tickNumber = 0;

  function setDenominator(ticks, set, subset)
  {
    var numerators = [];

    for(var i=0; i<ticks.length; i++)
    {
      numerators.push(ticks[i][set][subset].aggregate_result.numerator);
    }

    var denominator = Math.max.apply(null, numerators);

    for(var j=0; j<ticks.length; j++)
    {
      ticks[j][set][subset].aggregate_result.denominator = denominator;
    }
  }

  function reduce(tick, set, subset)
  {
    //keys
    var keys = Object.keys(tick[set][subset].clusteredValues).sort().map(
      function(x){
        return isNaN(x) ? x : x*1;
      });

    //reduce
    tick[set][subset].aggregate_result={numerator:0, denominator:0};

    for(var u=0; u<keys.length; u++)
    {
      //tick[set][subset].aggregate_result.denominator += tick[set][subset].clusteredValues[keys[u]].count;
      if(tick[set][subset].clusteredValues[keys[u]].count>1)tick[set][subset].aggregate_result.numerator++;
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
        (tick[set][subset].values[s][field] > previousValue[field]) ||
        (tick[set][subset].values[s][field] < previousValue[field]))
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

        if(a[prop] === null && b[prop] === null) return 0;
        if(a[prop] === null) return -1;
        if(b[prop] === null) return 1;

        return b[prop] < a[prop] ? 1 : b[prop] > a[prop] ? -1 : 0;
      };
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

        for(var i=0; i<queries.length; i++)
        {
          for(var j=0; j<queries[i].executions.length; j++)
          {
            if( typeof queries[i].executions[j].aggregate_result.denominator !== 'undefined')
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

//547376f6410804c6f7000003
//45567

// This task depends on `models` and `httpd` tasks.
module.exports = [ 'models', 'httpd', routes ];
