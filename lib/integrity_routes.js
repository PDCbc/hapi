'use strict';
var async = require('async'),
_ = require('lodash'),
logger = require('./logger').Logger('integrity_routes', 1);

var util = require('util');

/**
* Sets up the standard routes for the application. Check the express documentation on routers.
* @param  {Function} next The async callback. Signature (error, result)
* @param  {Object}   data Contains results of the `models` and `httpd` task.
*/
function integrity_routes(next, data) {
  var router = new require('express').Router();

  router.get('/:title/:endpoint/:provider/:months',
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
          if(err)
          {
            logger.log("ERROR: " + err);
            return;
          }

          if(queries.length===0)
          {
            logger.log("ERROR: No query by that name");
            res.json({message:"ERROR: No query by that name"});
            return;
          }

          if(!queries[0].executions || queries[0].executions.length<1)
          {
            logger.log("Error: Query - " + req.params.title + " has no executions");
            return;
          }

          execution = queries[0].executions[queries[0].executions.length-1]._id;
          //should only have one query with a given name -- we need the latest one

          data.models.result.find({execution_id:execution}).exec(
            function(err, results)
            {
              var field_admit_pairs_result = [];
              var short_title = req.params.title.substr("Integrity".length+1);

              logger.log('short_title: ' + short_title);

              for(var i=0; i<results.length; i++)
              {
                var values = results[i].value.toJSON();

                var field_admit_pairs = [];

                for(var key in values)
                {
                  if(['_id', 'query_id', 'created_at'].indexOf(key)!=-1)//drop hquery junk
                  {
                    continue;
                  }

                  var kvps = key.split('_');
                  var field_admit_pair = {};

                  field_admit_pair[short_title] = kvps[0];
                  field_admit_pair.admit = kvps[1];
                  field_admit_pair.value = values[key];
                  field_admit_pair.result_id = results[i]._id;
                  field_admit_pair.endpoint = results[i].endpoint_id;
                  field_admit_pair.provider = kvps[2];
                  field_admit_pairs.push(field_admit_pair);
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
                  ticks[temp1].values = ticks[temp1].values.sort(propComparator(short_title));
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
                      return x[short_title] === null ? null :
                      isNaN(x[short_title]) ? x:x[short_title]*1;
                    }
                  ).sort( propComparator(short_title) );

                  clusterByValue(ticks[r], "network", "PDC", short_title);

                  var clinicKeys = Object.keys(ticks[r].clinic);

                  for(var s=0; s<clinicKeys.length; s++)
                  {
                    ticks[r].clinic[clinicKeys[s]].values.sort( propComparator(short_title) );
                    clusterByValue(ticks[r], "clinic", clinicKeys[s], short_title);
                  }

                  var providerKeys = Object.keys(ticks[r].provider);

                  for(var t=0; t<providerKeys.length; t++)
                  {
                    ticks[r].provider[providerKeys[t]].values.sort( propComparator(short_title) );
                    clusterByValue(ticks[r], "provider", providerKeys[t], short_title);
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
                  }

                  //provider
                  var providers = Object.keys(ticks[u].provider);

                  for(var w=0; w<providers.length; w++)
                  {
                    reduce(ticks[u], "provider", providers[w]);
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

                logger.log('ticks[zz].clinic: ' + util.inspect(ticks[zz].clinic));

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

              response.title = short_title;
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
      if(ticks[i][set][subset] !== undefined)
      {
        numerators.push(ticks[i][set][subset].aggregate_result.numerator);
      }
    }

    var denominator = Math.max.apply(null, numerators);

    for(var j=0; j<ticks.length; j++)
    {
      if(ticks[j][set][subset] !== undefined)
      {
        ticks[j][set][subset].aggregate_result.denominator = denominator;
      }
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


  data.httpd.use('/integrity', router);
  next(null, router);
}

module.exports = [ 'models', 'httpd', integrity_routes ];
