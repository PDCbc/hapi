'use strict';
var async = require('async'),
    _ = require('lodash'),
    logger = require('./logger');
var util = require('util');
var r = require("./reports/PolypharmacyReport")

/**
 * Manage request for tabular reports. 
 * @param  {Function} next The async callback. Signature (error, result)
 */
function report_routes(next, data){

    var reports = [
        r.PolypharmacyReport("polypharmacy-report", "Polypharmacy Report", ["PDC-1178", "PDC-053", "PDC-054"]),
    ];

    var router = new require('express').Router()

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
        function(req, res){

            logger.success("reports/");

            var return_reports = []; 

            async.eachSeries(
                reports,
                function(item, next){
                    item.validReport(req, function(valid, data, err){

                        if(err){

                            logger.error("reports/ "+err); 

                            next(err); 

                        }else{

                            if(valid === true){

                                return_reports.push(item.getReportSummary());

                            }

                            next();

                        } 

                    }); 

                }, function(err) {

                    if ( err ){

                        logger.error("error in report_routes.js "+util.inspect(err)); 

                    }

                    res.json(return_reports);
                }
            );
        }
    ); 

    /*
    * Generates a CSV file that corresponds to the correct report title
    * 
    * Uses cached results, first call "/" route to cause a lookup. 
    */
    router.route('/:title').get(
        data.middleware.verifyAuth,
        function(req, res){

            var title = req.params.title.replace(/\.[^/.]{1,4}$/, ""); //trim off any incoming file extensions ( 1 to 4 characters )

            logger.warn("/reports/"+title)

            for(var k = 0; k < reports.length; k++ ){

                if ( reports[k].getReportSummary().shortTitle === title ){

                    reports[k].generateReport(req, function(s){

                        res.send(new Buffer(s));

                    });

                }

            }

        }
    );

    data.httpd.use("/reports", router); 

    next(null, router);
}


/*
* Takes an object of results and generates a CSV string 
* that can be returned as a file for download to the client. 
*
* @param data {Object} - an object that contains several processed_results that can be used to 
*                        to generate the csv. This is in the format of: 
*                        { "QUERY_ID" : { "clinician" : [...], "group" : [...], "network" : [...] } }
*/
function generatePolypharmacyCSV(data){

    logger.warn(util.inspect(data, false, null));

    var s = ""; 
    var n = 0;
    var d = 0; 

    //set up headers,
    s += ",Active patients >= 65 yrs,%,Active patients >= 65 yrs on > 5 medications,%,Active patients >= 65 yrs on > 10 medications,%\n"; 

    s += "clinician,"; 

    n = data["PDC-1178"].clinician[data['PDC-1178'].clinician.length-1]["aggregate_result"].numerator; 
    d = data["PDC-1178"].clinician[data['PDC-1178'].clinician.length-1]["aggregate_result"].denominator; 

    s += n+",";
    s += ((n/d)*100)+",";

    n = data["PDC-053"].clinician[data['PDC-053'].clinician.length-1]["aggregate_result"].numerator; 
    d = data["PDC-053"].clinician[data['PDC-053'].clinician.length-1]["aggregate_result"].denominator; 

    s += n+",";
    s += ((n/d)*100)+",";

    n = data["PDC-054"].clinician[data['PDC-054'].clinician.length-1]["aggregate_result"].numerator; 
    d = data["PDC-054"].clinician[data['PDC-054'].clinician.length-1]["aggregate_result"].denominator; 
    
    s += n+","; 
    s += ((n/d)*100)+","; 

    s += "\n";

    s += "group,"; 

    n = data["PDC-1178"].group[data['PDC-1178'].group.length-1]["aggregate_result"].numerator; 
    d = data["PDC-1178"].group[data['PDC-1178'].group.length-1]["aggregate_result"].denominator; 

    s += n+",";
    s += ((n/d)*100)+",";

    n = data["PDC-053"].group[data['PDC-053'].group.length-1]["aggregate_result"].numerator; 
    d = data["PDC-053"].group[data['PDC-053'].group.length-1]["aggregate_result"].denominator; 

    s += n+",";
    s += ((n/d)*100)+",";

    n = data["PDC-054"].group[data['PDC-054'].group.length-1]["aggregate_result"].numerator; 
    d = data["PDC-054"].group[data['PDC-054'].group.length-1]["aggregate_result"].denominator; 
    
    s += n+","; 
    s += ((n/d)*100)+","; 

    s += "\n";


    s+="network,"; 

    n = data["PDC-1178"].network[data['PDC-1178'].network.length-1]["aggregate_result"].numerator; 
    d = data["PDC-1178"].network[data['PDC-1178'].network.length-1]["aggregate_result"].denominator; 

    s += n+",";
    s += ((n/d)*100)+",";

    n = data["PDC-053"].network[data['PDC-053'].network.length-1]["aggregate_result"].numerator; 
    d = data["PDC-053"].network[data['PDC-053'].network.length-1]["aggregate_result"].denominator; 

    s += n+",";
    s += ((n/d)*100)+",";

    n = data["PDC-054"].network[data['PDC-054'].network.length-1]["aggregate_result"].numerator; 
    d = data["PDC-054"].network[data['PDC-054'].network.length-1]["aggregate_result"].denominator; 
    
    s += n+","; 
    s += ((n/d)*100); 

    s += "\n";

    return s; 

}


// This module depends on the `environment` task.
module.exports = [ 'middleware', 'httpd', 'models', 'routes', report_routes ];