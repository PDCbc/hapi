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
        .get(function (req, res) {
            res.render('login', req.user);
        })
        .post(function (req, res) {
            logger.error("Auth not implemented yet.");
        });
    // Log out.
    router.get('/auth/logout', function (req, res) {
        logger.error("Auth Not implemented yet.");
        res.redirect('/auto');

    });

    // A list of valid items to visualize.
    router.get('/api',
        //function (req, res, next) { logger.error("Auth not implemented yet"); next(); },
        function (req, res) {

            data.models.query.find({}).populate('user_id').select("_id executions user_id").exec(function (err, queries) {

              //provide endpoint
              //get endpoint results for each execution
              var execution_ids = [];
              data.models.processed_result.network = [];

              for(var i=0; i<queries.length; i++)
              {
                for(var j=0; j<queries[i].executions.length; j++)
                {
                  data.models.processed_result.network.push(
                    {time: new Date(queries[i].executions[j].time).toDateString(),
                      aggregate_result:queries[i].executions[j].aggregate_result});

                  execution_ids.push(queries[i].executions[j]._id);
                }
              }

              data.models.processed_result.clinic = [];

              data.models.result.find({execution_id: {$in : execution_ids}, endpoint_id: req.query.endpoint_id}).select("value").exec(
                function (err, results) {
                  for(var i=0; i<results.length; i++)
                  {
                    if(results[i].value)
                    {
                      data.models.processed_result.clinic.push(
                        {time: new Date(results[i].value.created_at).toDateString(),
                          aggregate_result:
                            {numerator_has_recorded_values: results[i].value.numerator_has_recorded_values,
                              "denominator_patients_above_19": results[i].value.denominator_patients_above_19}
                        }
                      );
                    }
                  }
                  res.json({ processed_result:data.models.processed_result});
                }
              );
            });
        }
    );

//e.g., https://hubapi.scoop.local:8080/api/BMI?endpoint_id=XXXX
    router.get('/api/processed_result/:title',
/**** TODO: 4-002 End of things Fieran needs to change. ****/
        function (req, res, next) {
          logger.error("Auth Not implemented yet."); next();
        },
        function (req, res) {

          //fetch network data
          data.models.query.find({title:req.params.title})
                            .populate('user_id')
                            .select("_id executions user_id")
                            .exec(function (err, queries) {

            var execution_ids = [];
            data.models.processed_result.network = [];

            for(var i=0; i<queries.length; i++)
            {
              for(var j=0; j<queries[i].executions.length; j++)
              {
                if(typeof queries[i].executions[j].aggregate_result.numerator_has_recorded_values !== 'undefined' &&
                typeof queries[i].executions[j].aggregate_result.denominator_patients_above_19 !== 'undefined')
                {

                  data.models.processed_result.network.push(
                    {time: new Date(Date(queries[i].executions[j].time)).toDateString(),//javscript funniness with dates
                      aggregate_result:queries[i].executions[j].aggregate_result});
                  execution_ids.push(queries[i].executions[j]._id);
                }
              }
            }

            //fetch clinic data
            data.models.processed_result.clinic = [];

            data.models.result.find({execution_id: {$in : execution_ids}, endpoint_id: req.query.endpoint_id})
                              .select("value").exec(
              function (err, results) {
                collectResultValues(results, data.models.processed_result.clinic);

                //fetch personal data
                data.models.processed_result.clinician = [];

                data.models.result.find({})//filter to results for clinician's result values
                                  .select("value").exec(
                  function(err, results){
                    collectResultValues(results, data.models.processed_result.clinician);
                    //continue to return old result for now
                    res.json({ processed_result:data.models.processed_result});
                  }
                );
              }
            );
          }
        );
      }
    );

    // Attach the router.
    data.httpd.use(router);
    next(null, router);
}

function collectResultValues(results, processed_results_section)
{
  for(var i=0; i<results.length; i++)
  {
    console.log(results[i]);
    if(results[i].value._id)//exclude empty values
    {
      processed_results_section.push(
        {time: new Date(results[i].value.created_at).toDateString(),
          aggregate_result:
            {numerator_has_recorded_values: results[i].value.numerator_has_recorded_values,
              denominator_patients_above_19: results[i].value.denominator_patients_above_19}
        }
      );
    }
  }
}
// This task depends on `models` and `httpd` tasks.
module.exports = [ 'models', 'httpd', routes ];
