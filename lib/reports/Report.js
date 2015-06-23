'use strict';

var logger  = require('../logger').Logger("Report", 1); 
var util    = require("util"); 
var async   = require('async');
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
    * 
    * @param url {String} - The path to request to on the hubapi for data, will have the title parameter appended to it.
    *       if url = "/api/foo/" and title: "bar" will result in call to: http://localhost:PORT/api/foo/bar/
    *       if url is not provided will default to "/api/processed_result/:title" route on the HAPI.
    */
    var make_request = function ( req, title, next, url){

        if ( !req ){

            next(null, "invalid request object passed to Report.make_request(req, '"+title+"', next)");

        }

        url = url || '/api/processed_result/'

        if ( title === undefined || title === null ){

            next(null, "invalid title (::"+title+"::) passed to Report.make_request(req, title, next)");

        }

        request.get(
            {
                url : 'https://localhost:'+process.env.PORT+url+title+"?cookie="+req.query.cookie,
                json : true
            },
            function( err, response, body ){

                try{

                    if( response && response.statusCode ){

                        switch ( response.statusCode ){

                            case 200:

                                if ( body && body.processed_result ){

                                    return next(null, body.processed_result);

                                }else{

                                    logger.warn("Report.make_request() to "+url+title+ " returned status 200, but had invalid body.");
                                    return next(204, null);

                                }

                                break; 

                            case 204: 

                                logger.warn("Report.make_request() to "+url+title+" returned 204 no content available.");
                                return next(204, null);
                                break; 

                            case 400:

                                logger.warn("Report.make_request() to "+url+title+" returned 400 malformed request.");
                                return next(400, null);
                                break;

                            case 404:

                                logger.warn("Report.make_request() to "+url+title+" returned 404 the requested query does not exist.");
                                return next(404, null);
                                break;

                            case 401:

                                logger.warn("Report.make_request() to "+url+title+" returned 401 user's credentials expired.");
                                return next(401, null);
                                break; 

                            case 500:

                                logger.warn("Report.make_request() to "+url+title+" returned 500 some error occurred.");
                                return next(500, null);
                                break;

                            default:

                                logger.warn("Report.make_request() to "+url+title+" returned status: "+response.statusCode+" unable to handle this case.");
                                return next(500, null);
                                break;

                        }

                    }

                }catch(e){

                    logger.error("Report.make_request() to "+url+title+ " failed due to an exception: "+ util.inspect(e, false, null));
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


        for(var k in data){

            //check that we haven't run up the prototype chain.
            //
            if( !data.hasOwnProperty(k) ){
                continue; 
            }


            d = data[k]

            for(var j = 0; j < fields.length; j++ ){

                var x = fields[j];

                tmp_date = (new Date(d[x][d[x].length - 1]["time"])).getTime();

                if ( tmp_date <= min_date ){

                    min_date = tmp_date;

                }

                if ( tmp_date >= max_date ){

                    max_date = tmp_date; 

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
        var results = {}; 

        //we need to use async.eachSeries(...) so that we don't overwhelm the auth component.
        //  auth component can't handle simultaneous requests that are using the same cookie. 
        async.eachSeries(
            depends,
            function( item, callback ){ //item is a single string that represents a query title

                proc.make_request(req, item, function(err, result){

                    if ( err ){

                        //if 204 was the error then there was no data for that query,
                        //we just ignore this and use the valid flag to indicate 
                        //that the query had no content.
                        if( err === 204){

                            valid = false; 
                            return callback();

                        }else if( err === 404){ //this means that route was not available on the HAPI. 

                            valid = false; 
                            return callback();


                        }else{

                            return callback(err); 

                        }

                    }else{

                        if ( !proc.checkResult(result) ){

                            valid = false; 

                        }else{

                            results[item] = result;

                        }

                        return callback(null);
                    }


                });

            },function( err ){

                if(err){

                    logger.error("Reports.fetch_results() error: "+err);
                    next(err, null, null);

                }else{

                    if (valid === true){

                        return next(null, proc.checkTemporalSeperationOfResults(results), results);
 
                    }else{

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
    var checkResult = function(result){

        if ( 
            !result || 
            !result.clinician ||
            result.clinician.length <= 0 ||
            !result.group ||
            result.group.length <= 0 ||
            !result.network || 
            result.network.length <= 0
        ){

            return false; 

        }else{

            return true; 

        }

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
    *       function(Error, String), where String is a string to output to the report itself, if there was an
    *       error and the report could not be generated the String will be null. Error is an HTTP error code, there 
    *       was no error the Error field will be null. 
    */
    var generateReport = function(req, next){

        validReport(req, function(err, valid, data){

            if ( err && err !== 200 ){

                next(err, null);

            }else{


                if ( valid === true ){

                    //here we call the protected version of the 
                    //method generateCSVReport so that if someone 
                    //overrides the method in a sub-object the 
                    //right method will still get called. 
                    next(null, proc.generateCSVReport(data));

                }else{

                    next(204, null);

                }

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
    *           function (Error, Boolean, Object), where Boolean is whether the report has
    *               had its dependencies satisfied, and data is an object that 
    *               has the data from the queries we are interested in.
    */
    var checkDependants = function(req, next){

        if( depends === undefined || depends === null ){

            //return 204, the report was not correctly configured.
            return next(204, false, null); 

        }

        fetch_results(req, function(err, valid, data){

            if( err ){

                return next(err, false, null);

            }else{

                return next(null, valid, data);

            }

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

            logger.info("Found a cached result from timestamp:"+last_cached_date.getTime()+" using this instead of query for new data.");
            next(null, cached_valid, cached_result); 
            return; 

        }

        logger.info("Cached results for "+that.shortName +" are expired, refreshing cache.")

        //if we fall through then we should probably check the report validity again.
        //
        checkDependants(req, function(err, valid, data){


            if ( err ){

                return next(err, false, null);

            }else{

                cached_valid = valid;
                cached_result = data;  
                last_cached_date = new Date(); //set the last cached date to now.

                logger.info("Setting cached data for report: "+that.shortName);

                next(null, valid, data);

            }
             

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
    proc.make_request      = make_request; 
    proc.checkResult       = checkResult; 
    proc.checkTemporalSeperationOfResults = checkTemporalSeperationOfResults; 



    return that; 
}

module.exports = {Report : Report}; 