'use strict';

var logger  = require('../logger').Logger("FlexibleReport", 1);
var util    = require("util");
var async   = require('async');
var request = require('request');
var Report  = require("./Report").Report;

/**
 * A generic report object or function. This object allows the report to be generated regardless of
 * whether *all* of the dependencies for the report have been met.
 *
 * This object extends the functionality in the Report object.
 *
 * This uses the Functional pattern described in the book:
 *   "JavaScript: The Good Parts" by Douglas Crockford.
 *
 * @param shortName {String} - A string that that can be used in a URL (no spaces, or special characters).
 * @param name {String} - A string that describes the report.
 * @param dependancies {Array} - An array of strings that represent the queries the report depends on.
 * @param proc {Object} - An object shared by this (Parent object) and the sub-object in which to store
 *      protected values.
 *
 */
var FlexibleReport = function (shortName, name, dependancies, proc) {

    //initialize protected object interface:
    proc = proc || {};

    //inherit from Report object.
    var that = Report(shortName, name, null, proc);

    //Private variables for this class.
    //Query titles that this report depends on.
    proc.depends = dependancies || [];

    /**
     * Finds the most recent execution date, excludes query executions from report that are not within
     * 1 week of this most recent execution.
     *
     * @param data {Object} - An object, structured like:
     *      { title : { clinician : [{ time : XXX, ...}], group : { time : XXX, ... }, network : { time : XXX, } }, ... }
     *
     * @return {Object} - An array of the same structure as the input, but with queries that are not appropriately
     *  temporally separated removed.
     */
    var checkTemporalSeperationOfResults = function (data) {

        var min_date = Number.MAX_VALUE;
        var max_date = Number.MIN_VALUE;
        var tmp_date = null;

        var fields = ["clinician", "group", "network"];
        var d      = null;
        var x      = null;

        // tmp_date = (new Date(d[x][d[x].length - 1]["time"])).getTime();

        //find the most recent execution in all of the data.
        for (var q in data) {

            if (!data.hasOwnProperty(q)) {
                continue;
            }

            d = data[q];

            for (var f = 0; f < fields.length; f++) {

                x = fields[f];

                tmp_date = (new Date(d[x][d[x].length - 1]["time"])).getTime();

                if (tmp_date > max_date) {
                    max_date = tmp_date;
                }

            }

        }

        var fail = false;

        for (q in data) {

            fail = false;

            if (!data.hasOwnProperty(q)) {

                continue;

            }

            d = data[q];

            for (f = 0; f < fields.length; f++) {

                x = fields[f];

                tmp_date = (new Date(d[x][d[x].length - 1]["time"])).getTime();

                //if (Math.floor(max_date - tmp_date) > 604800000) {
                if (Math.floor(max_date - tmp_date) > 86400) {

                    fail = true;

                }

            }

            if (fail) {
                delete data[q];
            }

        }

        return data;

    };

    /**
     * Gets results for all queries that this report depends
     * also determines if all of the dependent queries have been run
     * for the report.
     *
     * @param req {Object} - Node express Request object, must contain a valid cookie
     *        in req.query.cookie to be used to make a request onto the rest endpoint
     *
     * @param next (Funciton) - the function to call after we have fetched (or tried to fetch) all
     *       of the results for the report. Function will have prototype of:
     *           function(error, valid_report, results), valid_report is boolean that is true if
     *           all of the dependencies have been met. results is an object that contains the
     *           results fetched for each query, in format:
     *               {"QUERY_ID":  {
     *                  clinician : { aggregate_result : {...}, time : Number},
     *                  group : { aggregate_result : {...}, time : Number },
     *                  network : { aggregate_result : {...}, time: Number }
     *                  },
      *              ... }
     */
    var fetch_results = function (req, next) {

        if (!req) {

            next("invalid request object passed to Report.fetch_results(req, next)", null, null);

        }

        var valid   = true;
        var results = {};

        //we need to use async.eachSeries(...) so that we don't overwhelm the auth component.
        //  auth component can't handle simultaneous requests that are using the same cookie. 
        async.eachSeries(
            proc.depends,
            function (item, callback) { //item is a single string that represents a query title

                proc.make_request(req, item, function (err, result) {

                    if (err) {

                        //if 204 was the error then there was no data for that query,
                        //we just ignore this and use the valid flag to indicate 
                        //that the query had no content.
                        if (err === 204 || err == 404) {

                            return callback();

                        } else {

                            return callback(err);

                        }

                    } else {

                        if (proc.checkResult(result)) {

                            //only store the result if it is valid.
                            //if it is not valid, we just ignore it.
                            results[item] = result;

                        }

                        return callback(null);
                    }

                });

            }, function (err) {

                if (err) {

                    logger.error("Reports.fetch_results() error: " + err);
                    next(err, null, null);

                } else {

                    if (valid === true) {

                        return next(null, true, proc.checkTemporalSeperationOfResults(results));

                    } else {

                        //there was an error or the query we were looking for did not exist.
                        return next(null, false, null);

                    }

                }

            }
        );

    };

    proc.checkTemporalSeperationOfResults = checkTemporalSeperationOfResults;
    proc.fetch_results                    = fetch_results;


    return that;
};

module.exports = {FlexibleReport: FlexibleReport};