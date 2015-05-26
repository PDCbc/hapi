'use strict';

var logger  = require('../logger'); 
var util    = require("util"); 
var async   = require('async');
var request = require('request');

/**
* A generic report object or function. 
* 
* This uses the Functional pattern described in the book:
*   "JavaScript: The Good Parts" 
* 
* @param shortName {String} - A string that that can be used in a URL (no spaces, or special characters).
* @param name {String} - A string that describes the report.
* @param dependancies {Array} - An array of strings that represent the queries the report depends on. 
*                        
*/
var Report = function(shortName, name, dependancies, proc){

    var that = {

        name : name,
        shortName : shortName

    }; 

    //initialize protected object interface:
    proc = proc || {}; 

    //Private variables for this class.
    //Query titles that this report depends on.
    var depends = dependancies || []; 
    var cached_valid = false; 
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
    */
    var make_request = function ( req, title, next ){

        if ( !req ){

            next(null, "invalid request object passed to Report.make_request(req, '"+title+"', next)");

        }

        if ( title === undefined || title === null ){

            next(null, "invalid title (::"+title+"::) passed to Report.make_request(req, title, next)");

        }

        request.get(
            {
                url : 'https://localhost:'+process.env.PORT+'/api/processed_result/'+title+"?cookie="+req.query.cookie,
                json : true
            },
            function( err, response, body ){

                //process our answer here...

                if ( err ){

                    next(err, null);

                }else if ( response.status_code === 404 ){

                    var em = "Report.make_request() to /api/processed_result/"+title+" returned 404";
                    logger.error(em);
                    next(em, null)

                }else if ( response.status_code === 500 ){

                    var em = "Report.make_request() to /api/processed_result/"+title+" returned 500";
                    logger.error(em);
                    next(em, null)

                }else if( response === undefined || response === null || response === {} ){

                    var em = "Report.make_request() to /api/processed_result/"+title+" failed to return response object";
                    logger.error(em);
                    next(em, null)

                }else if ( body === undefined || body === null || body == {} ){

                    var em = "Report.make_request() to /api/processed_result/"+title+" failed did not return a valid body in response";
                    logger.error(em);
                    next(em, null)

                }else if ( body.processed_result === undefined || body.processed_result === null ){

                    var em = "Report.make_request() to /api/processed_result/"+title+" failed, did not return a body.processed_result field.";
                    logger.error(em);
                    next(em, null)

                }else{

                    next(err, body.processed_result);

                }

            }
        );

    };


    /**
    * Checks that all of the most recent results are within 1 week (7 days)
    * of each other. This prevents us from generating a report where data from
    * one query is much older than data for another query.
    *
    * @param data {Array} - An array of objects, structured like: 
    *       [ { title : "PDC-XXX", result:{ "clinician" : {...}, "group" : {...}, "network" : { ...} } }, ... ]
    *
    * @return - true all values are within 1 week from each other, false otherwise.
    */
    var checkTemporalSeperationOfResults = function(data){

        var d = null; 
        var min_date = Number.MAX_VALUE;
        var max_date = Number.MIN_VALUE;
        var tmp_date = null;  

        var fields = ["clinician", "group", "network"];

        for ( var k = 0; k < data.length; k ++ ){


            d = data[k];

            if ( !d || !d.title || !d.result ){

                continue; 

            }else{

                for(var j = 0; j < fields.length; j++ ){

                    var x = fields[j];

                    tmp_date = (new Date(d.result[x][0]["time"])).getTime();

                    if ( tmp_date <= min_date ){

                        min_date = tmp_date;

                    }

                    if ( tmp_date >= max_date ){

                        max_date = tmp_date; 

                    }

                }

            }

        }


        if ( Math.abs(max_date - min_date) > 604800000 ){ //604800000 ms in a week. 

            return false; //this fails, we want the max seperation between results to be 1 week.

        }else{

            return true;

        }  

    } 

    /*
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
    var fetch_results = function(req, next) {

        if ( !req ){

            next("invalid request object passed to Report.fetch_results(req, next)", null, null);

        }

        var valid = true; 
        var results = []; 

        //we need to use async.eachSeries(...) so that we don't overwhelm the auth component.
        //  auth component can't handle simultaneous requests that are using the same cookie. 
        async.eachSeries(
            depends,
            function( item, callback ){ //item is a single string that represents a query title

                make_request(req, item, function(err, result){


                    if ( err ){

                        callback(err); 

                    }else{

                        logger.warn(util.inspect(result));

                        if ( 
                            !result || 
                            !result.clinician ||
                            result.clinician.length <= 0 ||
                            !result.group ||
                            result.group.length <= 0 ||
                            !result.network || 
                            result.network.length <= 0
                        ){

                            valid = false; 

                        }else{

                            results.push({
                                "title":item, 
                                "result": result
                            });

                        }

                    }

                    callback(null);


                });

            },function( err ){

                if(err){

                    logger.error("Reports.fetch_results() error: "+err);
                    next(err, null, null);

                }else{

                    if (valid === true){

                        next(null, checkTemporalSeperationOfResults(results), results);
 
                    }else{

                        //case where the report queries this report depends on have not 
                        // been executed or failed to provide data. 
                        next(null, false, null);

                    }

                }

            }

        );

    };

    /**
    * A private method that generates a CSV formatted report.
    * 
    * This should be overridden for the specific type of report we want.
    *
    * @param data {Object} - Query results in an object that we can manage.
    *
    * @return {String} a CSV string that represents the report. 
    */
    var generateCSVReport = function(data){

        var s = "a,b,c,d";
        return s; 

    }

    /**
    * Generates the string that represents the report.
    * 
    * @param req {Object} - A Node Express Request object, must contain a valid cookie to pass to auth.
    * @param next {Function} - A function to call after we are done out processing here. Has prototype like:
    *       function(String), where String is a string to output to the report itself.
    */
    var generateReport = function(req, next){

        validReport(req, function(valid, data){

            if ( valid === true ){

                next(proc.generateCSVReport(data));

            }else{

                next("ERROR: Report could not be generated, check that all queries were run for this report.");

            }

        });
    } 

    /**
    * Determines if all of the queries that this report
    * depends on have been executed.
    *
    * @param req {Object} - Node Express Request object.
    * 
    * @param next {Function} - A function to call when we are done checking 
    *       the dependancies for the report. Has prototype like: 
    *           function (Boolean, Object), where Boolean is whether the report has
    *               had its dependencies satisfied, and data is an object that 
    *               has the data from the queries we are interested in.
    */
    var checkDependants = function(req, next){

        if( depends === undefined || depends === null ){

            next(false, data); 

        }

        var results = fetch_results(req, function(err, valid, data){

            next(valid, data);

        });

    }

    /**
    * Determines if this report is able to be run.
    *
    * This function utilizes a cached result so that we don't have to make to many 
    * HTTPS requests to other components. Caches results from the last 5 seconds
    * which should mean that we don't have to re-fetch data within the same report generation
    * 
    * In the event that the cached result has expired, we will re-fetch the data.
    *
    * @param req {Object} - Node Express request object.
    * @param next {Function} - the function to call when we are done checking if the report is valid. 
    *       this function has prototype like: function(Boolean), where Boolean is true if the report is valid.
    */
    var validReport = function(req, next){

        //if we don't have a last cached date we set it to something a while 
        // ago so that it gets automatically refreshed.
        //
        if ( last_cached_date === null ){

            last_cached_date = (new Date()).getTime() - 86000000; 

        }

        //check to see if we have checked the report validity within the last minute.
        //if we have we don't we can assume it probably hasn't changed. 
        // 
        if ( Math.abs((new Date()).getTime() - last_cached_date) < 5000 ){

            logger.warn("Found a cached result from timestamp:"+last_cached_date.getTime()+" using this instead of query for new data.");
            next(cached_valid, cached_result, null); 
            return; 

        }

        logger.warn("Cached results are expired, refreshing cache.")

        //if we fall through then we should probably check the report validity again.
        //
        checkDependants(req, function(valid, data){

            cached_valid = valid;
            cached_result = data;  
            last_cached_date = new Date(); //set the last cached date to now.

            logger.warn("Setting cached data for report: "+that.shortName);

            next(valid, data, null); 

        }); 

    }


    /**
    * Returns an object that contains a summary of the report.
    */
    var getReportSummary = function(){

        return {

            shortTitle : shortName,
            title : name

        };

    }


    /**
    * Returns a JSON String version of the report summary.
    */
    var toJSONString = function(){

        return JSON.stringify(getReportSummary());

    }


    //add the functions we wish to make public to 
    // object we are going to return.
    that.generateReport = generateReport; 
    that.validReport    = validReport; 
    that.toJSONString   = toJSONString; 
    that.getReportSummary = getReportSummary; 

    //add functions or variables from this object that need
    //to be visible to other objects that inherient from this one.

    proc.generateCSVReport = generateCSVReport;



    return that; 
}

module.exports = {Report : Report}; 