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
var popHealth    = require("../reports/PopulationHealthReport");

/**
 * Manage request for tabular reports.
 * @param  {Function} next The async callback. Signature (error, result)
 */
function report_routes(next, data) {

    var reports = [

        pph.PolypharmacyReport("polypharmacy-report", "Polypharmacy Report", null),
        statinsReport.StatinsReport("statin-report", "Statins Report", null),
        medclassReport.MedClassReport("medclass-report", "Medication Class Report", null),
        attachment.AttachmentActivePatientReport("attachment-active-patients-report", "Active Patients Report ", null),
        demographics.DemographicsReport("demographics-report", "Demographics Report", null, null),
        demographics.DemographicsReport("encounters-report", "Encounters Report", ["PDC-1740"], null),
        popHealth.PopulationHealthReport("disease-management-report", "Quality Improvement Metrics Disease Management Report", [
            "PDC-992",
            "PDC-993",
            "PDC-995",
            "PDC-1134",
            "PDC-1899",
            "PDC-1135",
            "PDC-1135A",
            "PDC-1135B",
            "PDC-1135C",
            "PDC-1135D",
            "PDC-1136",
            "PDC-1150",
            "PDC-1153",
            "PDC-1155",
            "PDC-1899",
            "PDC-1900",
            "PDC-1901",
            "PDC-1902",
            "PDC-1903",
            "PDC-1904",
            "PDC-1905",
            "PDC-1906",
            "PDC-1919"
        ], null),
        popHealth.PopulationHealthReport("prevalence-report", "Quality Improvement Metrics: Prevalence", [
            "PDC-602",
            "PDC-954",
            "PDC-955",
            "PDC-958",
            "PDC-959",
            "PDC-960",
            "PDC-962",
            "PDC-999",
            "PDC-1000",
            "PDC-1004",
            "PDC-1785",
            "PDC-1786",
            "PDC-1787",
            "PDC-1788"
        ], null),
        popHealth.PopulationHealthReport("practice-reflection-report", "Practice Reflection Report", [
            "PDC-732",
            "PDC-733",
            "PDC-734",
            "PDC-735",
            "PDC-736",
            "PDC-737",
            "PDC-738",
            "PDC-739",
            "PDC-740",
            "PDC-741",
            "PDC-742",
            "PDC-743",
            "PDC-744",
            "PDC-745",
            "PDC-747",
            "PDC-748",
            "PDC-750",
            "PDC-751",
            "PDC-752",
            "PDC-753",
            "PDC-754",
            "PDC-755",
            "PDC-756",
            "PDC-757",
            "PDC-758",
            "PDC-759",
            "PDC-760",
            "PDC-831",
            "PDC-831",
            "PDC-831",
            "PDC-831",
            "PDC-831",
            "PDC-831",
            "PDC-831",
            "PDC-832",
            "PDC-833",
            "PDC-834",
            "PDC-836",
            "PDC-837",
            "PDC-838",
            "PDC-840",
            "PDC-842",
            "PDC-843",
            "PDC-845",
            "PDC-846",
            "PDC-865",
            "PDC-882",
            "PDC-889",
            "PDC-1921",
            "PDC-1922",
            "PDC-1923",
            "PDC-1924",
            "PDC-1925",
            "PDC-1926",
            "PDC-1927",
            "PDC-1928",
            "PDC-1929",
            "PDC-1930",
            "PDC-1932",
            "PDC-1933",
            "PDC-1934",
            "PDC-1935",
            "PDC-1936"
        ], null)

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

                        item.canExecute(req, function (err, valid, data) {

                            if (err) {

                                logger.error("reports/ " + err);

                                return next(err);

                            } else {

                                logger.warn(item.shortName + " : valid=" + valid);

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

                                logger.success(util.inspect(return_reports));
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
                logger.error(e.stack);
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
			    var sNull = s===null;
                            logger.info("Got response for report: " + title + ' s null: ' + sNull);

                            if (err && err !== 200) {

                                switch (err) {

                                    case 204:
                                        logger.warn("Request for /reports/" + title + " returned no content.");
					var e = new Error();
					console.log(e.stack);
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

                                logger.warn(err);
                                logger.warn("ReportRoutes: Could not get data for report: " + title + ", returning status 204.");
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
