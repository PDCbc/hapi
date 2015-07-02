/**
 * Created by sdiemert on 2015-06-29.
 */
var util  = require('util');
var async = require('async');
var fs    = require('fs');

var queryTitle = process.env.QUERY || 'PDC-001';

var doReport = function (data) {

    var mr = null;

    //demographics and encounters (use Master report)
    if (queryTitle === 'PDC-001' || queryTitle === 'PDC-1740') {

        mr = require("./MasterReport.js").MasterReport(data);

    } else if (queryTitle === 'PDC-1738') { // active patients (ratio type).

        mr = require("./AttachedActivePatientsReport.js").AttachedActivePatientReport(data);

    } else {

        console.log('unknown query title : ' + queryTitle + " failed to generate report. ");
        process.exit();

    }

    var s = mr.getReport();

    console.log(s);

    fs.writeFileSync('report.csv', s);

    console.log("Completed Report");


};

var onConnect = function (data) {

    data.query.find(
        {title: queryTitle},

        function (err, result) {

            if (result.length !== 1) {

                console.log("Could not find exactly one query with title : " + queryTitle + " in HubDB. Failed to generate report.");
                process.exit();

            }

            var exes = [];

            async.each(
                result[0].executions,
                function (exe, callback) {

                    data.result.find(
                        {execution_id: exe._id},
                        function (e, r) {

                            if (r.length > 0) {

                                data.endpoint.find(
                                    {_id: r[0].endpoint_id},

                                    function (ep_err, ep_result) {

                                        if (ep_err) callback(ep_err);

                                        if (ep_result.length > 0) {

                                            r[0].endpoint_name = ep_result[0].name;
                                            exes.push(r[0]);

                                        }

                                        callback(e);

                                    }
                                );

                            } else {

                                callback(e);

                            }


                        }
                    )

                },
                function (err) {

                    if (err) {

                        console.log("Error while trying to get data: " + err);
                        console.log("Generating report failed. Exiting...");
                        process.exit();

                    }

                    doReport(exes);

                    process.exit();
                }
            );

        }
    );

};

console.log("Starting");

console.log("QUERY=" + process.env.QUERY);
console.log("EXECUTION_DATE=" + process.env.EXECUTION_DATE);

require('./Database.js').Database("mongodb://localhost:27019/query_composer_development", onConnect);




