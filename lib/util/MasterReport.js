/**
 *
 * Created by sdiemert on 2015-07-06.
 */

var MasterReport = function (data, dayOfMonth, proc) {

    var that = {};

    proc = proc || {};

    dayOfMonth = dayOfMonth || process.env.EXECUTION_DATE;

    var getReport = function (withProviders) {

        return "SOME NOT REPORT STRING";

    };

    that.getReport = getReport;

    return that;
};

module.exports = {MasterReport: MasterReport};
