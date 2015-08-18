'use strict';
var async      = require('async');
var _          = require('lodash');
var logger     = require('../logger').Logger('metadata_routes', 1);
var util       = require('util');
var queryTypes = require("../queries.js");

/**
 * Manage request for tabular reports.
 * @param  {Function} next The async callback. Signature (error, result)
 */
function metadata_routes(next, data) {

    var router = new require('express').Router();

    var handleError = function (e, req, res) {

        logger.error("/retro/" + req.params.title + " caught an exception: " + util.inspect(e, false, null));
        logger.error(e.stack);
        res.status(500);
        return res.json(null);

    };

    /**
     * Returns a JSON object that has data for multiple executions of the
     * query.
     */
    router.route('/:title').get(
        data.middleware.verifyAuth,
        function (req, res) {

            //object to return, the code below will populate the
            // this data object with meta data.
            var data = {};

            try {

                data.models.query
                    .find({title: req.params.title})
                    .select("_id title description executions").exec(
                    function (err, queries) {

                        try {

                            if (err) {

                                logger.error("500: Error accessing the HubDB for " + req.params.title + " : " + err);
                                res.status(500);
                                res.json(null);
                                return;

                            } else if (queries.length !== 1) {

                                logger.error("404: Not exactly one query with title: " + req.params.title);
                                res.status(404);
                                res.json(null);
                                return;

                            } else if (!queries[0] || !queries[0].executions) {

                                logger.error("500: Invalid query object returned from HubDB for title: " + req.params.title);
                                res.status(500);
                                res.json(null);
                                return;

                            } else if (queries[0].executions.length < 1) {

                                logger.warn("204: No executions found for query: " + req.params.title);
                                res.status(204);
                                res.json(null);
                                return;

                            }

                            var exes = queries[0].executions;

                            if (!exes) {

                                logger.warn("204: No query executions were found, returning empty object");
                                res.status(204);
                                return res.json({});

                            }


                            data.id                  = req.params.title;
                            data.description         = queries[0].description;
                            data.network_id          = "PDC";
                            data.num_executions      = exes.length;
                            data.last_execution_date = exes[exes.length - 1].time;

                            //TODO: Implement target in mongo database and schema
                            // data.target = { value : Number, reference : String, description: String}
                            data.target = queries[0].target ? queries[0].target : {
                                value      : null,
                                reference  : "N/A",
                                description: "N/A"
                            };


                            //check to see if the short_description field is in the data model
                            if (queries[0].short_description) {

                                //if the short descirption field is in the data model, then we
                                // know that we should use that as the "human readable"
                                data.title       = queries[0].short_description;
                                data.description = queries[0].description;

                            } else {

                                //if there is no short_description field from Mongo, then we can asusme
                                //that there will be title and description in the description field seperated by a colon.
                                var s = queries[0].description.split(":");

                                data.title = s[0];

                                //check that there is something after the title.
                                if (s.length > 1) {
                                    data.description = s[1]
                                }

                            }

                            data.units = queries[0].units ? queries[0].units : null;

                            //TODO: Remove this when we get "units" sorted out.
                            if (req.params.title === "PDC-1740") {

                                //this is a special case where the xAxis of the visualization
                                //needs to be labelled "Number of Encounters".

                                data.xAxisTitle = "Number of Encounters";

                            }


                            res.status(200);
                            res.json(data);

                        } catch (e) {

                            return handleError(e, req, res);

                        }

                    }
                );

            }
            catch
                (e) {

                return handleError(e, req, res);

            }

        }
    )
    ;

    data.httpd.use("/meta", router);

    next(null, router);
}

// This module depends on the `environment` task.
module.exports = ['middleware', 'httpd', 'models', 'routes', metadata_routes];