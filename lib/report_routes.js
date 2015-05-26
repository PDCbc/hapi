'use strict';
var async = require('async'),
    _ = require('lodash'),
    logger = require('./logger');
var util = require('util');
var pph = require("./reports/PolypharmacyReport");
var statinsReport = require("./reports/StatinsReport");

/**
 * Manage request for tabular reports. 
 * @param  {Function} next The async callback. Signature (error, result)
 */
function report_routes(next, data){

    var reports = [
        pph.PolypharmacyReport("polypharmacy-report", "Polypharmacy Report"),
        statinsReport.StatinsReport("statin-report", "Statins Report"),
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

// This module depends on the `environment` task.
module.exports = [ 'middleware', 'httpd', 'models', 'routes', report_routes ];