/**
 *
 * Created by sdiemert on 2015-07-06.
 */

var Execution = require("./Execution.js").Execution;

var MasterReport = function (data, dayOfMonth, proc) {

    var that = {};

    proc = proc || {};

    dayOfMonth = dayOfMonth || process.env.EXECUTION_DATE;

    console.log(data);

    proc.executions = [];

    for (var i = 0; i < data.length; i++) {

        proc.executions.push(Execution(data[i].value, data[i].created_at, data[i].endpoint_id));

    }

    var getReport = function (withProviders) {

        for (var e = 0; e < proc.executions.length; e++) {

            proc.executions[e].getDataByClinician();

        }

        return "SOME NOT REPORT STRING";

    };

    that.getReport = getReport;

    return that;
};

module.exports = {MasterReport: MasterReport};
