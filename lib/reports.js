'use strict';
var async = require('async'),
    _ = require('lodash'),
    logger = require('./logger');
var util = require('util');
/**
 * Manage request for tabular reports. 
 * @param  {Function} next The async callback. Signature (error, result)
 */
function reports(next, data){

    logger.warn("loading reports module!"); 

    var router = new require('express').Router();

    var queryGroups = {
        //"polypharmacyReport" : ["PDC-053", "PDC-054"]
        "polypharmacyReport" : ["PDC-053", "PDC-054", "PDC-1178"]
    }

    var titles = {

        "polypharmacyReport" : "Polypharmacy Report"

    }

    var cachedResults = {

        "polypharmacyReport" : {}

    }

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
        function(req, res, next){

            next();

        },
        data.middleware.verifyAuth,
        function(req, res){

            logger.success("reports/ " + req.session.user.clinician)

            var result = []; 
            var pass = true; 

            var keys = []; 
            for(var k in queryGroups){
                keys.push(k);
            }

            async.each(
                keys,
                function(group, groupCallback){
                    pass = true; 
                    async.eachSeries(
                        queryGroups[group], 
                        function(item , callback){

                            logger.warn(item + " " + req.session.user.clinician);

                            //item is a string that is the PDC-XXX title of query.
                            //callback needs to be called when we are done with item.

                            require('request').get(
                                { 
                                    url: "https://localhost:"+process.env.PORT+"/api/processed_result/"+item + '?cookie=' + req.query.cookie, 
                                    json: true

                                }, function (error, response, body) {

                                    if (error ){

                                        logger.error("/reports/"+req.params.title+" : "+error); 

                                    }else{

                                        if( !(body.processed_result && 
                                            body.processed_result.clinician &&
                                            body.processed_result.group     &&
                                            body.processed_result.network   &&
                                            body.processed_result.clinician.length > 0 &&
                                            body.processed_result.group.length > 0 &&
                                            body.processed_result.network.length > 0)
                                        ){

                                            logger.error(group + " " + item)
                                            pass = false; 

                                        }else{

                                            logger.warn(group + " "+ item)
                                            cachedResults[group][item] = body.processed_result;

                                        }

                                    }
                                    callback(); 

                                }
                            )
                        }, function(err){

                            //get here we have completed all of the requests for the queries in 
                            // this group. 

                            if(err){

                                logger.error("/reports/ : "+ err);

                            }else{ 

                                if ( pass ){

                                    result.push({"title":titles[group], "shortTitle":group});

                                }else{

                                }
                                groupCallback(); 

                            }

                        }
                    );  

                }, function(err){

                    if(err){

                        logger.error("/reports/ : "+ err);

                    }

                    res.json(result);

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

            var title = req.params.title;

            logger.warn("/reports/"+title)

            if( !cachedResults[title] ){

                if ( queryGroups[title] ){

                    var s = "Could not find a cached result for this report type. Make sure all queries required for this report have been executed."
                    s += "\n required queries for "+ title + " are: \n"
                    queryGroups[title].forEach(function(d){

                        s += d +"\n"; 

                    });

                }else{

                    var s = "Could not find a report type for: "+title; 

                }

                res.json(s); 
                return;  
            }

            //need to start building up CSV here.

            res.send(new Buffer( generatePolypharmacyCSV(cachedResults[title]) ));
        }
    );

    data.httpd.use("/reports", router); 

    logger.warn("done loading reports module");

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
module.exports = [ 'middleware', 'httpd', 'models', 'routes', reports ];