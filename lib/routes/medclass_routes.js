'use strict';
var _       = require('lodash');
var logger  = require('../logger').Logger("medclass_routes", 1);
var util    = require('util');
var request = require('request');
var test    = require('../../test/fixtures/medclass.js');
var MedClassResultManager = require("../resultManager/MedClassResultManager.js").MedClassResultManager;

function medclass_routes(next, data) {

    var router = new require('express').Router();

    router.route("/").get(
        data.middleware.verifyAuth,
        function (req, res) {
            data.models.query.find({title: 'PDC-055'}).exec(
                function (err, result) {

                    try {

                        if (err) {

                            logger.error('/medclass : Could not load query data from HubDB, error: ' + err);
                            res.status(500);
                            res.json(null);
                            return;

                        } else if (!result) {

                            logger.error("/medclass query got invalid result from Mongo, returning 500 to client.");
                            res.status(500);
                            res.json(null);
                            return;

                        } else if (result.length !== 1) {

                            logger.warn("/medclass query got " + result.length + " results from Mongo for PDC-055, returning 204 to client.");
                            res.status(204);
                            res.json(null);
                            return;


                        } else if (!result[0].executions || result[0].executions.length < 1) {

                            logger.warn("/medclass query has no executions, returning 204 to client");
                            res.status(204);
                            res.json(null);
                            return;

                        }

                        var exe = result[0].executions[result[0].executions.length - 1]; //get the most recent execution

                        if (!exe) {

                            logger.warn("/medclass obtained an invalid execution object from Mongo, returning 204 to client.");
                            res.status(204);
                            res.json(null);
                            return;

                        }

                        /**********************************/
                        // REMOVE THIS LINE AFTER WE ARE DONE DEVELOPMENT
                        //exe = test.testResult;
                        /***********************************/

                        logger.debug("Current ID: " + req.session.user.clinician);

                        //we need to JSON.stringify this data to remove unwanted objects in the prototype.
                        var x = MedClassResultManager(req.session.user.clinician, JSON.parse(JSON.stringify(exe)));

                        x.getFormattedData(function (data) {

                            try {

                                //need to go through and set time on the all of the
                                //drug objects.
                                var tmp = data.processed_result.drugs;
                                for (var i = 0; i < tmp.length; i++) {

                                    tmp[i].agg_data[0].time = exe.time;
                                    tmp[i].agg_data[1].time = exe.time;
                                    tmp[i].agg_data[2].time = exe.time;

                                }

                                data.title       = req.params.title;
                                data.description = result[0].description;
                                res.status(200);
                                return res.json(data);

                            } catch (e) {

                                logger.error("/medclass route caught an exception: " + util.inspect(e, false, null));
                                logger.error(e.stack);
                                res.status(500);
                                return res.json(null);

                            }

                        });

                    } catch (e) {

                        logger.error("/medclass route caught an exception: " + util.inspect(e, false, null));
                        logger.error(e.stack);
                        res.status(500);
                        return res.json(null);

                    }

                }
            );
        }
    );

    // Attach the router
    data.httpd.use('/medclass', router);
    return next(null, router);
}

// This task depends on `models` and `httpd` tasks.
module.exports = ['models', 'httpd', medclass_routes];
