'use strict';
var async          = require('async');
var _              = require('lodash');
var logger         = require('../logger').Logger('report_routes', 1);
var util           = require('util');
var pph            = require("../reports/PolypharmacyReport");
var statinsReport  = require("../reports/StatinsReport");
var medclassReport = require("../reports/MedClassReport");
var attachment     = require("../reports/AttachmentActivePatientReport");
var demographics = require("../reports/DemographicsReport");

/**
 * Manage request for tabular reports.
 * @param  {Function} next The async callback. Signature (error, result)
 */
function report_routes(next, data) {

    var reports = [

        pph.PolypharmacyReport("polypharmacy-report", "Polypharmacy Report"),
        statinsReport.StatinsReport("statin-report", "Statins Report"),
        medclassReport.MedClassReport("medclass-report", "Medication Class Report"),
        attachment.AttachmentActivePatientReport("attachment-active-patients-report", "Active Patients Report "),
        demographics.DemographicsReport("demographics-report", "Demographics Report")

    ];

    var router = new require('express').Router();

    /*
     * Returns the reports that are available based on which queries
     * have been executed. The queryGroups object defines which report
     * requires which query to be executed.
     *
     * If a report can be executed, this also caches the results to be used
     * later if needed. This avoids to many network requests.
     *
     */
    router.route("/").get(
        data.middleware.verifyAuth,
        function (req, res) {

            try {

                //check that we actually have reports to return.
                //if we don't send a 204 error.
                if (!reports || reports.length < 1) {

                    res.status(204);
                    return res.json([]);

                }

                logger.info("reports/");

                var return_reports = [];

                // need to use async.eachSeries because anything else
                // results in a set of parallel calls to the auth dacs component
                // that can't handle parallel requests on the same cookie, this is a 
                // significant weakness of DACS working with JS.
                //
                async.eachSeries(
                    reports,
                    function (item, next) {

                        item.validReport(req, function (err, valid, data) {

                            if (err) {

                                logger.error("reports/ " + err);

                                return next(err);

                            } else {

                                if (valid === true) {

                                    return_reports.push(item.getReportSummary());

                                }

                                return next();

                            }

                        });

                    }, function (err) {

                        try {

                            if (err) {

                                logger.error("error in report_routes.js " + util.inspect(err));

                                //expecting err to be an error status code.
                                res.status(err);
                                return res.json([]);

                            } else {

                                return res.json(return_reports);

                            }

                        } catch (e) {

                            logger.error("report/ caught an exception: " + util.inspect(e, false, null));
                            res.status(500);
                            return res.json([]);

                        }

                    }
                );

            } catch (e) {

                logger.error("report/ caught an exception: " + util.inspect(e, false, null));
                res.status(500);
                return res.json([]);

            }
        }
    );

    /*
     * Generates a CSV file that corresponds to the correct report title
     *
     * Uses cached results, first call "/" route to cause a lookup.
     */
    router.route('/:title').get(
        data.middleware.verifyAuth,
        function (req, res) {

            try {

                var title = req.params.title.replace(/\.[^/.]{1,4}$/, ""); //trim off any incoming file extensions ( 1 to 4 characters )

                logger.warn("/reports/" + title);

                var validTitle = false;

                for (var k = 0; k < reports.length; k++) {

                    if (reports[k].getReportSummary().shortTitle === title) {

                        validTitle = true;

                    }

                }

                if (!validTitle) {

                    logger.warn("Could not find report by title: " + title + " returning 404 to client.");
                    res.status(404);
                    return res.send();

                }

                for (var k = 0; k < reports.length; k++) {

                    if (reports[k].getReportSummary().shortTitle === title) {

                        reports[k].generateReport(req, function (err, s) {

                            if (err && err !== 200) {

                                switch (err) {

                                    case 204:
                                        logger.warn("Request for /reports/" + title + " returned no content.");
                                        res.status(204);
                                        break;
                                    case 400:
                                        logger.warn("Request for /reports/" + title + " failed with 400, bad request");
                                        res.status(400);
                                        break;
                                    case 401:
                                        logger.warn("Request for /reports/" + title + " failed with 401, invalid credentials");
                                        res.status(401);
                                        break;
                                    case 404:
                                        logger.warn("Request for /reports/" + title + " failed with 404, could not find resource.");
                                        res.status(404);
                                        break;
                                    case 500:
                                        logger.warn("Request for /reports/" + title + " failed with 500, server error.");
                                        res.status(500);
                                        break;
                                    default:
                                        logger.warn("Request for /reports/" + title + " failed with unknown error: " + err);
                                        res.status(500);
                                        break;
                                }

                                return res.send(null);


                            } else if (s) {

                                res.status(200);
                                return res.send(s);

                            } else {

                                logger.warn("Could not get data for report: " + title + ", returning status 204.");
                                res.status(204);
                                return res.send(null);

                            }


                        });

                    }

                }

            } catch (e) {

                logger.error("/report/" + req.params.title + " caught an error: " + util.inspect(e, false, null));
                logger.error(e.stack);
                res.status(500);
                return res.send();

            }

        }
    );

    data.httpd.use("/reports", router);

    next(null, router);
}

// This module depends on the `environment` task.
module.exports = ['middleware', 'httpd', 'models', 'routes', report_routes];