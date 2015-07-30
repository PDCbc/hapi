'use strict';
var async                     = require('async');
var logger                    = require('../logger').Logger('demographic_routes', 1);
var util                      = require('util');
var auth                      = require('../auth');
var DemographicsResultManager = require("../resultManager/DemographicsResultManager.js").DemographicsResultManager;


/**
 * Sets up the standard routes for the application. Check the express documentation on routers.
 * @param  {Function} next The async callback. Signature (error, result)
 * @param  {Object}   data Contains results of the `models` and `httpd` task.
 */
function demographic_routes(next, data) {

    var router = new require('express').Router();

    router.route('/').get(
        data.middleware.verifyAuth,
        function (req, res, next) {

            data.models.query.find({title: "PDC-001"}).exec(
                function (err, result) {

                    try {

                        if (err) {

                            logger.error("/demographics: Could not load query data from database, error: " + err);
                            res.status(500);
                            return res.json(null);

                        }

                        if (!result) {

                            logger.warn("/demograhpics query got invalid result from Mongo, returning 500 to client.");
                            res.status(500);
                            return res.json(null);

                        }

                        if (result.length !== 1) {

                            logger.warn("/demographics failed to find exactly one query with title: PDC-001, data:" + util.inspect(result));
                            res.status(500);
                            return res.json(null);

                        }

                        if (!result[0].executions || result[0].executions.length < 1) {

                            logger.warn("/demographics query has no executions, returning 204 to client.");
                            res.status(204);
                            return res.json(null);

                        }

                        var exe = result[0].executions[result[0].executions.length - 1]; //get last (most recent execution

                        //create an new result manager to encapsulate the data.
                        // Also a JSON/Javascript object hack to remove anything up the prototype chain.
                        var x = DemographicsResultManager(req.session.user.clinician, JSON.parse(JSON.stringify(exe)));

                        x.getFormattedData(function (data) {

                            try {

                                if (data) {

                                    data.title       = req.params.title;
                                    data.description = result[0].description;
                                    //regular data case
                                    res.status(200);
                                    return res.json(data);

                                } else {

                                    //no data.
                                    logger.warn("DemogrpahicsResultManager.getFormattedData() return null, could be an issue with data quality.");
                                    res.status(204);
                                    return res.json(null)

                                }

                            } catch (e) {
                                logger.error("/demographics caught an error: " + e);
                                logger.error(e.stack);
                                res.status(500);
                                return res.json(null);

                            }

                        });

                    } catch (e) {

                        logger.error("/demographics caught an error: " + e);
                        logger.error(e.stack);
                        res.status(500);
                        return res.json(null);

                    }

                }
            );

        }
    );

    data.httpd.use('/demographics', router);
    next(null, router);
}

module.exports = ['models', 'httpd', 'middleware', demographic_routes];
