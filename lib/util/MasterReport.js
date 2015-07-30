/**
 *
 * Created by sdiemert on 2015-07-06.
 */

var util = require("util");

var Execution = require("./Execution.js").Execution;

var MasterReport = function (data, dayOfMonth, proc) {

    var that = {};

    proc = proc || {};

    proc.dayOfMonth = dayOfMonth || process.env.EXECUTION_DATE;

    console.log(data);

    proc.executions = [];

    for (var i = 0; i < data.length; i++) {

        proc.executions.push(Execution(data[i].value, data[i].created_at, data[i].endpoint_name));

    }

    var sortExecutions = function (exes) {

        //filter out days that are not on the right day of the month.
        exes = exes.filter(function (e) {

            var tmp = new Date(e.getTime() * 1000);

            if (tmp.getDate() === proc.dayOfMonth) {

                return false;

            }

            return true;

        });

        return exes.sort(function (a, b) {

            if (a.getTime() > b.getTime()) {

                return 1;

            } else if (a.getTime < b.getTime()) {

                return -1;

            } else {
                return 0;
            }

        });
    };

    var massageData = function (execs) {

        console.log("massageData()");
        /*
         {
         clinic1 : {
         self : [ exe1, exe2, ...],
         provider1 : [ exe1, exe2, ...],
         ...
         },
         ...
         }
         */

        //indexed first by clinicians
        var toReturn = {};

        var providers = null;
        var clinic    = null;
        for (var e = 0; e < execs.length; e++) {

            providers = JSON.parse(JSON.stringify((execs[e].getDataByClinician())));
            clinic    = execs[e].getReducedData();

            if (!toReturn[clinic.endpoint]) {

                toReturn[clinic.endpoint] = {self: []};

            }

            toReturn[clinic.endpoint].self.push(clinic);

            for (p in providers) {

                if (!toReturn[clinic.endpoint][p]) {

                    toReturn[clinic.endpoint][p] = [];

                }

                toReturn[clinic.endpoint][p].push(providers[p])

            }

        }

        console.log(util.inspect(toReturn, false, null));

        return toReturn;
    };

    /**
     * Takes an array of executions and returns the subreport string.
     * @param exes
     */
    var generateSubReport = function (title, exes) {

        var s = "\n\n" + title + "\n";

        s += "Age Range,Gender,";

        var tmpDate = null;
        for (var e = 0; e < exes.length; e++) {

            tmpDate = new Date(exes[e].time * 1000);
            s += tmpDate.getFullYear() + "-" + (tmpDate.getMonth() + 1) + "-" + tmpDate.getDate() + ",";

        }

        s += "\n";

        for (var a in exes[0].data['male']) {

            s += a;

            for (var g in exes[0].data) {

                s += ",";
                s += g + ",";

                for (e = 0; e < exes.length; e++) {

                    s += exes[e].data[g][a] + ",";

                }

                s += "\n";

            }

        }

        console.log(s);

        return s;


    };

    var getTotals = function (byClinic) {


        //need to combine all executions into a list of executions.

        var totals = [];

        byClinic = JSON.parse(JSON.stringify(byClinic));

        for (var c in byClinic) {

            for (var e = 0; e < byClinic[c].self.length; e++) {

                if (!totals[e]) {

                    totals[e]          = {time: null, data: {}, endpoint: null};
                    totals[e].time     = byClinic[c].self[e].time;
                    totals[e].endpoint = byClinic[c].self[e].endpoint;

                }

                for (var g in byClinic[c].self[e].data) {

                    if (!totals[e].data[g]) {

                        totals[e].data[g] = {};

                    }

                    for (var a in byClinic[c].self[e].data[g]) {

                        if (!totals[e].data[g][a]) {

                            totals[e].data[g][a] = 0;

                        }

                        totals[e].data[g][a] += byClinic[c].self[e].data[g][a]

                    }

                }

            }

        }

        console.log("totals:");
        console.log(totals);

        return generateSubReport("Network Total", totals);

    };

    var getReport = function (withProviders) {

        //sorted by time.
        proc.executions = sortExecutions(proc.executions);

        var byClinic = JSON.parse(JSON.stringify(massageData(proc.executions)));


        //data is now massaged into format:

        /*
         {
         clinic1 : {
         self : [ exe1, exe2, ...],
         provider1 : [ exe1, exe2, ...],
         ...
         },
         ...
         }
         */

        var s = "";


        var count = 0;

        for (var c in byClinic) {

            s += generateSubReport("clinic_" + c, byClinic[c].self);

            if (withProviders) {

                for (var p in byClinic[c]) {

                    if (p === 'self') {
                        continue;
                    }

                    s += generateSubReport("clinic_" + c + "_provider_" + count, byClinic[c][p]);

                    count++;

                }

            }

        }

        s += getTotals(byClinic);

        return s;

    };

    that.getReport = getReport;

    return that;
};

module.exports = {MasterReport: MasterReport};
