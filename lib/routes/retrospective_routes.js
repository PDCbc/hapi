'use strict';
var async                          = require('async');
var _                              = require('lodash');
var logger                         = require('../logger').Logger('retrospective_routes', 2);
var util                           = require('util');
var RetroRatioResultManager        = require("../resultManager/RetroRatioResultManager.js").RetroRatioResultManager;
var RetroDemographicsResultManager = require("../resultManager/RetroDemographicsResultManager.js").RetroDemographicsResultManager;
var queryTypes                     = require("../queries.js");

/**
 * Manage request for tabular reports.
 * @param  {Function} next The async callback. Signature (error, result)
 */
function retrospective_routes(next, data) {

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

            try {

                //HAVE TO CHANGE HOW THIS WORKS IN ORDER TO ALL FOR TRUE 
                // RETROSPECTIVE DATA FROM THE HUBDB. 

                data.models.query
                    .find({title: req.params.title})
                    .exec(
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


                            var rrm = null;

                            switch (queryTypes.getQueryType(req.params.title)) {

                                case queryTypes.RATIO:

                                    rrm = RetroRatioResultManager(req.session.user.clinician, JSON.parse(JSON.stringify(exes)));
                                    break;

                                case queryTypes.DEMOGRAPHICS:

                                    rrm = RetroDemographicsResultManager(req.session.user.clinician, JSON.parse(JSON.stringify(exes)));
                                    break;

                                case queryTypes.MEDCLASS:

                                    logger.warn("No retrospective medclass result manager for: " + req.params.title + ". Aborting.");
                                    res.status(404);
                                    return res.json(null);
                                    break;

                                default:

                                    logger.warn("Could not find query type for query: " + req.params.title + ". Aborting.");
                                    res.status(404);
                                    return res.json(null);
                                    break;

                            }


                            rrm.getFormattedData(

                                function (result) {

                                    result.network_id = "PDC";
                                    result.title      = req.params.title;
                                    result.description = queries[0].description;
                                    result.display_name = queries[0]["display_name"];

                                    try {

                                        result.latest = exes[exes.length - 1].time;

                                    } catch (e) {

                                        logger.error(e);
                                        result.latest = null;

                                    }

                                    if (queries[0].title === "PDC-1740") {

                                        //this is a special case where the xAxis of the visualization
                                        //needs to be labelled "Number of Encounters".

                                        result.xAxisTitle = "Number of Encounters";

                                    }

                                    res.status(200);
                                    res.json(result);

                                }
                            );


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

    data.httpd.use("/retro", router);

    next(null, router);
}

// This module depends on the `environment` task.
module.exports = ['middleware', 'httpd', 'models', 'routes', retrospective_routes];
