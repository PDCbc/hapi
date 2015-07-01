/**
 * Created by sdiemert on 2015-06-29.
 */
var util  = require('util');
var async = require('async');
var fs    = require('fs');

var doReport = function (data) {

    var MasterReport = require("./MasterReport.js").MasterReport;

    console.log(data);

    var mr = MasterReport(data);

    var s = mr.getReport();

    console.log(s);

    fs.writeFileSync('report.csv', s);

    console.log("Completed Report");


};

var onConnect = function (data) {

    data.query.find(
        {title: 'PDC-1740'},
        function (err, result) {

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

                    if (err) console.log(err);

                    doReport(exes);
                }
            );
        }
    );

};

console.log("Starting");
require('./Database.js').Database("mongodb://localhost:27019/query_composer_development", onConnect);




