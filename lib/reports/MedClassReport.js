'use strict';

var logger  = require('../logger').Logger("MedClassReport", 1); 
var util    = require("util"); 
var Report  = require('./Report');
var request = require('request');

/**
* A specific MedClassReport object that is meant to produce 
* a report specific to the reporting requirements.
* 
* Inherits functionality from the Report object, this function should only
* implement functionality specific to generating output that is formatted for
* the medclass tabular reporting requirements. 
* 
* This report hardcodes the queries that the report depends on.
* 
* The relationship between the Report and MedClassReport objects is 
* an example of the Functional Pattern presented in the book: 
*   "JavaScript: The Good Parts" by Douglas Crockford.
*
* @param shortName {String} - A string that that can be used in a URL (no spaces, or special characters).
* @param name {String} - A string that describes the report.
* @param proc {Object} - An object that contains any protected variables or methods. If this is not
*       passed it will default to a new object, and will be passed to Report() and will contain protected
*       methods/variables that are accessible to the MedClassReport object, but should not 
*       be made publicly accessible. 
* 
* @return {Object} - an object that contains public functions and variables.
*/
var MedClassReport = function(shortName, name, proc){
    
    //initialize protected variables.
    proc = proc || {}; 

    //Inherit methods from the parent object. Protected methods/variables
    //will be available via the proc object after this function is called.
    //the that variable will contain the public methods/variables from
    //Report object.
    //
    var that = Report.Report(shortName, name, ["PDC-055"], proc);


    /**
    * Generates a CSV string that can be returned as the report.
    *
    * @param data {Object} - An object that contains the data to present in a report, has structure like:
    *       [ PDC-055 : { drugs:[ { drug_name : "XXX", agg_data:[ { set : "XXX", numerator : X, denominator: X }, ... ], ... }, ... ], ... }, ... ]
    * 
    * @return {String} - A CSV formatted string that can be returned to the caller. If no data is provided to this function
    *       a template string is returned. 
    */
    var generateCSVReport = function(data){
        
        var s = "";

        //check for invalid input data.
        if( !data || !data["PDC-055"] || !data["PDC-055"].drugs ){
            //return just headers if there is no data.
            return s; 
        }

        //set up headers,

        var t = data["PDC-055"].display_names.group; 

        s += "Medication Class,Clinician Count,Clinician %,"+t+" Count,"+t+" %,Network Count,Network %,\n"; 

        var d = data["PDC-055"].drugs; 

        var num = null;
        var den = null;
        var f = null; 

        for( var i = 0; i < d.length; i++ ){

            //skip malformed results
            if( !d[i].drug_name || !d[i].agg_data ){

                continue; 

            }

            s += d[i].drug_name+",";  

            f = d[i].agg_data; 

            for( var j = 0; j < f.length; j++ ){

                if( f[j].set === "clinician" ){

                    s += f[j].numerator+",";
                    s += ( (f[j].numerator/f[j].denominator)*100 ) + ",";
                    break; 

                } 

            }

            for( var j = 0; j < f.length; j++ ){

                if( f[j].set === "group" ){

                    s += f[j].numerator+",";
                    s += ( (f[j].numerator/f[j].denominator)*100 ) + ",";
                    break; 

                } 

            }
            for( var j = 0; j < f.length; j++ ){

                if( f[j].set === "network" ){

                    s += f[j].numerator+",";
                    s += ( (f[j].numerator/f[j].denominator)*100 ) + ",";
                    break; 

                } 

            }

            s += "\n";

        }

        return s;

    }

    /**
    * Makes a request to localhost:PORT/medclass: path on the hubapi and passes the results to the 
    * next function
    *
    * @param req {Object} - Node Express Request object, must contain a valid (authorized, and baked) cookie
    *       in req.query.cookie that can be used to identify the user and session for this request.
    *
    * @param title {String} - The title of the query we want to get results for, usually: PDC-XXX.
    *   This value is not used by this function, but is kept in place for consistency with the parent
    *   abstract Report method.
    * 
    * @param next {Function} - The function to call after the request has returned. Expects prototype like:
    *       function( error , processed_result ) where error is an error message and processed_result is an Object like:
    *           { 
    *               drugs: [
    *                   { drug_name: 'XXXX',
    *                     agg_data: [ 
    *                       { 
    *                           set: 'clinic',
    *                           numerator: 32,
    *                           denominator: 168,
    *                           time: 1432679777 
    *                       },{ 
    *                           set: 'network',
    *                           numerator: 32,
    *                           denominator: 168,
    *                           time: 1432679777 
    *                       },{ 
    *                           set: 'clinician',
    *                           numerator: 32,
    *                           denominator: 168,
    *                           time: 1432679777 
    *                       } 
    *                      ] 
    *                   }, ...
    *               ]
    *           } 
    */
    var make_request = function ( req, title, next ){

        if ( !req ){

            next(null, "invalid request object passed to MedClassReport.make_request(req, '"+title+"', next)");

        }

        if ( title === undefined || title === null ){

            next(null, "invalid title (::"+title+"::) passed to Report.make_request(req, title, next)");

        }

        request.get(
            {
                url : 'https://localhost:'+process.env.PORT+'/medclass?cookie='+req.query.cookie,
                json : true
            },
            function( err, response, body ){

                //process our answer here...
                if ( err ){

                    next(err, null);

                }else if ( response.status_code === 404 ){

                    var em = "Report.make_request() to /medclass returned 404";
                    logger.error(em);
                    next(em, null)

                }else if ( response.status_code === 500 ){

                    var em = "Report.make_request() to /medclass returned 500";
                    logger.error(em);
                    next(em, null)

                }else if( response === undefined || response === null || response === {} ){

                    var em = "Report.make_request() to /medclass failed to return response object";
                    logger.error(em);
                    next(em, null)

                }else if ( body === undefined || body === null || body == {} ){

                    var em = "Report.make_request() to /medclass failed did not return a valid body in response";
                    logger.error(em);
                    next(em, null)

                }else if ( body.processed_result === undefined || body.processed_result === null ){

                    var em = "Report.make_request() to /medclass failed, did not return a body.processed_result field.";
                    logger.error(em);
                    next(em, null)

                }else{

                    next(err, body.processed_result);

                }

            }
        );

    };

    /**
    * A function for the med class report to check that results are well formed when they come
    * back from thw hubapi
    * 
    * This function is meant to override the default implementation in the Report object
    * as it is specific to the med class reporting. 
    *
    * @param result {Object} - The result object to check.
    * 
    * @return true if the result is well formed, false otherwise. 
    */
    var checkResult = function( result ){

        if( result === undefined || result === null ){

            return false; 

        }

        if( !result.drugs ) {

            return false; 

        }

        return true;

    };

    /**
    * Checks that all of the queries that this report type relies on were 
    * run within a specified window of time.
    * 
    * This method overrides the default implementation that is provided in
    * the Report object.
    * 
    * This method will return true by default because we only have one 
    * query that we rely upon. So by definition it will always be
    * within 1 week of itself. 
    */
    var checkTemporalSeperationOfResults = function(data){

        return true; 

    }

    proc.generateCSVReport = generateCSVReport; 
    proc.make_request      = make_request; 
    proc.checkResult       = checkResult; 
    proc.checkTemporalSeperationOfResults = checkTemporalSeperationOfResults;

    return that;


}

module.exports = { MedClassReport : MedClassReport }; 