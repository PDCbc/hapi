'use strict';

var logger = require('../logger').Logger("Report", 1);
var util   = require("util");
var async  = require('async');
var request = require('request');

/**
 * A generic report object or function.
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
var Report = function (shortName, name, dependancies, proc) {

    var that = {

        name: name,
        shortName: shortName

    };

    //initialize protected object interface:
    proc = proc || {};

    proc.depends = dependancies || [];

    //Private variables for this class.
    //Query titles that this report depends on.
    var cached_valid     = false;
    var cached_result = null;
    var last_cached_date = null;


    /**
     * Makes a request to localhost:PORT/api/processed_result/:title: path on the hubapi.
     * Gets the aggregate results for the query that corresponds to the query identified by: :title:
     *
     * @param req {Object} - Node Express Request object, must contain a valid (authorized, and baked) cookie
     *       in req.query.cookie that can be used to identify the user and session for this request.
     *
     * @param title {String} - The title of the query we want to get results for, usually: PDC-XXX.
     *
     * @param next {Function} - The function to call after the request has returned. Expects prototype like:
     *       function( error , processed_result ) where error is an error message and processed_result is an Object like:
     *           {
    *               clinician : [ { aggregate_result : {...}, time : "DATE" }, ... ], 
    *               group : [ { aggregate_result : {...}, time : "DATE" }, ... ], 
    *               network : [ { aggregate_result : {...}, time : "DATE" }, ... ] 
    *           }
     *       In the event of an error, the error field is set to a message and the processed_result field is null.
     *
     * @param url {String} - The path to request to on the hubapi for data, will have the title parameter appended to it.
     *       if url = "/api/foo/" and title: "bar" will result in call to: http://localhost:PORT/api/foo/bar/
     *       if url is not provided will default to "/api/processed_result/:title" route on the HAPI.
     *
     * @param pr {Boolean} - Indicates whether to look for a "processed_result" field in the response. This a gross hack
     *  to use this function for multipe different requests.
     */
    var make_request = function (req, title, next, url, pr) {

        if (!req) {

            next(null, "invalid request object passed to Report.make_request(req, '" + title + "', next)");

        }

        url = url || '/retro/';

        if (pr === undefined || pr === null) {
            pr = true;
        }

        if (title === undefined || title === null) {

            next(null, "invalid title (::" + title + "::) passed to Report.make_request(req, title, next)");

        }

        var url = 'https://localhost:' + process.env.PORT + url + title + "?cookie=" + req.query.cookie;
	
        request.get(
            {
		url: url,
                json: true
            },
            function (err, response, body) {

		if(err) {
		  logger.error('make_request get triggered an error: ' + err);
		  return null;
		}
		
                try {

                    if (response && response.statusCode) {

                        switch (response.statusCode) {

                            case 200:

                                if (body && body.processed_result && pr) {
				    return next(null, body.processed_result);
				    
                                } else if (body && !pr) {
                                    return next(null, body);

                                } else {

                                    logger.warn("Report.make_request() to " + url + title + " returned status 200, but had invalid body. pr=" + pr);
                                    return next(204, null);

                                }

                                break;

                            case 204:

                                logger.warn("Report.make_request() to " + url + title + " returned 204 no content available.");
                                return next(204, null);
                                break;

                            case 400:

                                logger.warn("Report.make_request() to " + url + title + " returned 400 malformed request.");
                                return next(400, null);
                                break;

                            case 404:

                                logger.warn("Report.make_request() to " + url + title + " returned 404 the requested query does not exist.");
                                return next(404, null);
                                break;

                            case 401:

                                logger.warn("Report.make_request() to " + url + title + " returned 401 user's credentials expired.");
                                return next(401, null);
                                break;

                            case 500:

                                logger.warn("Report.make_request() to " + url + title + " returned 500 some error occurred.");
                                return next(500, null);
                                break;

                            default:

                                logger.warn("Report.make_request() to " + url + title + " returned status: " + response.statusCode + " unable to handle this case.");
                                return next(500, null);
                                break;

                        }

                    }

                } catch (e) {

                    logger.error("Report.make_request() to " + url + title + " failed due to an exception: " + util.inspect(e, false, null));
                    logger.error(e.stack);
                    return next(500, null);

                }

            }
        );

    };


    /**
     * Checks that all of the most recent results are within 1 week (7 days)
     * of each other. This prevents us from generating a report where data from
     * one query is much older than data for another query.
     *
     * @param data {Object} - An object, structured like:
     *      { title : { clinician : { time : XXX, ...}, group : { time : XXX, ... }, network : { time : XXX, } }, ... }
     *
     * @return {Boolean} - true all values are within 1 week from each other, false otherwise.
     */
    var checkTemporalSeperationOfResults = function (data) {

        var d        = null;
        var min_date = Number.MAX_VALUE;
        var max_date = Number.MIN_VALUE;
        var tmp_date = null;

        var fields = ["clinician", "group", "network"];


        for (var k in data) {

            //check that we haven't run up the prototype chain.
            //
            if (!data.hasOwnProperty(k)) {
                continue;
            }


            d = data[k];

            for (var j = 0; j < fields.length; j++) {

                var x = fields[j];

                tmp_date = (new Date(d[x][d[x].length - 1]["time"] * 1000)).getTime();

                if (tmp_date <= min_date) {

                    min_date = tmp_date;

                }

                if (tmp_date >= max_date) {

                    max_date = tmp_date;

                }

            }

        }

        return Math.abs(max_date - min_date) > 604800000 ? false : true;

    };

    /**
     *
     * @param data {Object} has structure: { PDC-XXX : { last_execution_date : Number, ...}, ...}
     *
     * @return {Boolean} true if the results are appropriate, false otherwise.
     */
    var checkMetaDataResults = function (data) {

        var min_date = Number.MAX_VALUE;
        var max_date = Number.MIN_VALUE;
        var tmp_date = null;
        var d        = null;


        for (var k in data) {

            if (!data.hasOwnProperty(k)) {
                continue;
            }

            //ignore queries that might have returned this as null.
            if (!data[k].last_execution_date) {
                continue;
            }

            tmp_date = new Date(data[k].last_execution_date * 1000);

            if (tmp_date.getTime() < min_date) {

                min_date = tmp_date.getTime();

            }
            if (tmp_date.getTime() > max_date) {

                max_date = tmp_date.getTime();

            }

        }

        var r = Math.abs(max_date - min_date) > 604800000 ? false : true;

        //logger.success("CheckMetaDataResults("+that.shortName+"): "+ r + " max: "+ max_date + " min: "+ min_date);

        return r;

    };

    /**
     * @param req {Object} - Node express Request object.
     * @param next {Function} - has prototype: function(err {Object}, valid {boolean}, result {Object})
     */
    var fetch_metadata = function (req, next) {

        var results = {};
        var valid   = true;

        async.eachSeries(
            proc.depends,
            function (item, callback) {

                //item is a String: "PDC-XXX"
                //callback is Function: function(error)

                proc.make_request(req, item, function (err, result) {

                    if (err) {

                        if (err === 204) {

                            //no data...
                            valid = false;
                            callback();

                        } else if (err === 404) {

                            //invalid query title
                            valid = false;
                            callback();

                        } else {

                            valid = false;
                            callback(err);

                        }

                    } else {
			results[item] = result;
                        valid         = true;
                        callback();
                    }

                }, "/meta/", false);


            }, function (err) {

                if (err) {

                    logger.warn("fetch_metadata received an error: " + err);
                    return next(err, false, null);

                } else {

                    if (valid === true) {

                        return next(null, true, results)

                    } else {

                        return next(null, false, results);
                    }

                }

            }
        )

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
     *               [{title : "QUERY_ID", result : { ... SOME RESULTS ...}, ...]
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
                        if (err === 204) {

                            valid = false;
                            return callback();

                        } else if (err === 404) { //this means that route was not available on the HAPI.

                            valid = false;
                            return callback();


                        } else {

                            return callback(err);

                        }

                    } else {
		      
                        if (!proc.checkResult(result)) {
                            valid = false;
                        } else {

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

                        return next(null, proc.checkTemporalSeperationOfResults(results), results);

                    } else {

                        //case where the report queries this report depends on have not
                        // been executed or failed to provide data.
                        return next(null, false, null);

                    }

                }

            }
        );

    };

    /**
     * Determines if a result from the serve is valid or not.
     *
     * This method should be overridden by sub-objects to support
     * other formats that may be returned by the hubapi.
     *
     * @returns {Boolean} - true if the rest is valid, false otherwise.
     */
    var checkResult = function (result) {

	var status = true;
	
	if(!result) {
	  logger.error('Report.js - checkResult - result evaluated to false');
	  status = false;
	}
	
	if(!result.clinician) {
	  logger.error('Report.js - checkResult - result.clinician evaluated to false');
	  status = false;
	}
	else if(result.clinician.length <= 0) {
	  logger.error('Report.js - checkResult - result.clinician.length <= 0');
	  status = false;
	}
	
	if(!result.group) {
	  logger.error('Report.js - checkResult - result.group evaluated to false');
	  status = false;
	}
	else if(result.group.length <= 0) {
	  logger.error('Report.js - checkResult - result.group.length <= 0');
	  status = false;
	}
	
	if(!result.network) {
	  logger.error('Report.js - checkResult - result.network evaluated to false');
	  status = false;
	}
	else if(result.network.length <= 0) {
	  logger.error('Report.js - checkResult - result.network.length <= 0');
	  status = false;
	}

        return status;
    };

    /**
     * A private method that generates a CSV formatted report.
     *
     * This should be overridden for the specific type of report we want.
     *
     * @param data {Object} - Query results in an object that we can manage.
     * @param metadata {Object} - Meta data about the queries this report depends on.
     *
     * @return {String} a CSV string that represents the report.
     */
    var generateCSVReport = function (data, metadata) {


        throw {

            name: "UnimplementedMethodError",
            message: "The method Report.generateCSVReport is an abstract method that must be implemented by a sub-object."

        };

    };

    /**
     * Generates the string that represents the report.
     *
     * @param req {Object} - A Node Express Request object, must contain a valid cookie to pass to auth.
     * @param next {Function} - A function to call after we are done out processing here. Has prototype like:
     *       function(Error, String), where String is a string to output to the report itself, if there was an
     *       error and the report could not be generated the String will be null. Error is an HTTP error code, there
     *       was no error the Error field will be null.
     */
    var generateReport = function (req, next) {

        validReport(req, function (err, valid, data) {
	  
            if (err && err !== 200) {

                next(err, null);

            } else {


                if (valid === true) {

                    proc.fetch_metadata(req, function (err, valid, meta) {

                        //here we call the protected version of the
                        //method generateCSVReport so that if someone
                        //overrides the method in a sub-object the
                        //right method will still get called.
                        next(null, proc.generateCSVReport(data, meta));

                    });


                } else {

                    next(204, null);

                }

            }

        });
    };

    /**
     * Determines if all of the queries that this report
     * depends on have been executed.
     *
     * @param req {Object} - Node Express Request object.
     *
     * @param next {Function} - A function to call when we are done checking
     *       the dependancies for the report. Has prototype like:
     *           function (Error, Boolean, Object), where Boolean is whether the report has
     *               had its dependencies satisfied, and data is an object that
     *               has the data from the queries we are interested in.
     */
    var checkDependants = function (req, next) {

        if (proc.depends === undefined || proc.depends === null) {

            //return 204, the report was not correctly configured.
            return next(204, false, null);

        }

        proc.fetch_results(req, function (err, valid, data) {

            if (err) {
		logger.error('checkDependents fetch results had an error: ' + err);
                return next(err, false, null);

            } else {

                return next(null, valid, data);

            }

        });

    };

    /**
     * Determines if this report is able to be run.
     *
     * This function will trigger the report to generated as well as return whether
     * the report can run.
     *
     * It SHOULD NOT be used if you only need meta data about the report, or need to find out
     * if it can be run. Use can_execute() instead for this.
     *
     * This function utilizes a cached result so that we don't have to make to many
     * HTTPS requests to other components. Caches results from the last 5 seconds
     * which should mean that we don't have to re-fetch data within the same report generation
     *
     * In the event that the cached result has expired, we will re-fetch the data.
     *
     * @param req {Object} - Node Express request object.
     * @param next {Function} - the function to call when we are done checking if the report is valid.
     *       this function has prototype like: function(Boolean, Object) where
     *       Boolean is true if the report is valid and Object is data to put in the report.
     */
    var validReport = function (req, next) {

        checkDependants(req, function (err, valid, data) {

            if (err) {

                return next(err, false, null);

            } else {

                cached_valid  = valid;
                cached_result = data;
                last_cached_date = new Date(); //set the last cached date to now.

                logger.info("Setting cached data for report: " + that.shortName);

                next(null, valid, data);

            }

        });

    };


    /**
     * Determines if the can be executed. Should be used when we only want to check
     * whether the report *can* be run, but do not need the full result.
     *
     * @param req {Object} Node Express Request object.
     * @param next {Function} - the callback function for when this is complete. Has signature: function(error {Object}, valid {Boolean}, result {Object})
     */
    var canExecute = function (req, next) {

        proc.fetch_metadata(req, function (err, valid, meta) {

            // meta has structure { PDC-XXX : { meta-data-object }, ... }

            if (err || !meta || valid === false) {

                return next(err, false, null);

            } else {

                //check if all dependancies have been met.

                for (var d = 0; d < proc.depends.length; d++) {

                    //check that the query is in the meta data object.
                    if (!meta.hasOwnProperty(proc.depends[d])) {

                        return next(null, false, null);

                    }

                    //check that we have executions.
                    if (meta[proc.depends[d]].num_executions <= 0) {

                        return next(null, false, null);

                    }

                }

                //check whether the results are close enough together to be considered reportable.
                var r = proc.checkMetaDataResults(meta);

                if (r === true) {

                    return next(null, true, meta);

                } else {

                    return next(null, false, null);

                }


            }

        });

    };


    /**
     * Returns an object that contains a summary of the report.
     */
    var getReportSummary = function () {

        return {

            shortTitle: shortName,
            title: name

        };

    };


    /**
     * Returns a JSON String version of the report summary.
     */
    var toJSONString = function () {

        return JSON.stringify(getReportSummary());

    };


    //add the functions we wish to make public to
    // object we are going to return.
    that.generateReport   = generateReport;
    that.validReport      = validReport;
    that.toJSONString     = toJSONString;
    that.getReportSummary = getReportSummary;
    that.canExecute       = canExecute;

    //add functions or variables from this object that need
    //to be visible to other objects that inherient from this one.

    proc.generateCSVReport    = generateCSVReport;
    proc.make_request                     = make_request;
    proc.checkResult                      = checkResult;
    proc.checkTemporalSeperationOfResults = checkTemporalSeperationOfResults;
    proc.fetch_results        = fetch_results;
    proc.fetch_metadata       = fetch_metadata;
    proc.checkMetaDataResults = checkMetaDataResults;


    return that;
};

module.exports = {Report: Report};
