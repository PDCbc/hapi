/**
 * Created by sdiemert on 2015-07-02 *
 *
 * Generates a report that shows the AttachedActivePatients.
 *
 * This report should only be used to generate master reports
 * upon request from PDC administrators. It is not meant to be
 * used by the normal HAPI webservice.
 */


var util      = require("util");
var logger    = require('../logger.js').Logger("AttachedActivePatientsReport", 1);
var Execution = require('./ActivePatientExecution.js').Execution;
//var MasterReport = require('./MasterReport.js').MasterReport;


var AttachedActivePatientReport = function (data, dayOfMonth, proc) {

    proc = proc || {};

    var that = {}; //MasterReport(data, dayOfMonth, proc);

    that.raw_data = data;

    that.dayOfMonth = dayOfMonth || parseInt(process.env.EXECUTION_DATE) || 30;

    var massageData = function (data) {


        /* Expects data like:
         [ {
         time: 1436224089,
         endpoint: 'ep0',
         data: { cpsid: { denominator: 0, numerator: 0 } }
         },{
         time: 1436224104,
         endpoint: 'ep0',
         data: { cpsid: { denominator: 0, numerator: 0 } }
         } ]
         */

        //reformats data into:
        /*

         {
         clinic : {
         self : [exe1, exe2, ...],
         provider1 : [exe1, exe2, ...],
         ...
         },
         ...
         }

         */

        var toReturn = {};

        var tmp = null;
        for (var e = 0; e < data.length; e++) {

            if (!toReturn[data[e].getEndpoint()]) {

                toReturn[data[e].getEndpoint()] = {self: []};

            }

            tmp = data[e].getReducedData();

            toReturn[tmp.endpoint].self.push({
                numerator  : tmp.data.numerator,
                denominator: tmp.data.denominator,
                time       : tmp.time
            });

            tmp = data[e].getCompressedData();

            for (var c in tmp.data) {

                if (toReturn[tmp.endpoint][c] === undefined) {

                    toReturn[tmp.endpoint][c] = [];

                }

                toReturn[tmp.endpoint][c].push({
                    time       : tmp.time,
                    numerator  : tmp.data[c].numerator,
                    denominator: tmp.data[c].denominator
                });

            }

        }

        console.log(util.inspect(toReturn, false, null));

        return toReturn;

    };

    var getReport = function (withProviders) {

        that.executions = [];
        that.exes = [];

        //key: clinic name, value : array of executions.
        that.clinicData = {};

        var l       = null;
        var tmpDate = null;

        console.log("Number of executions: " + that.raw_data.length);
        console.log("Day of Month: " + that.dayOfMonth);

        for (var i = 0; i < that.raw_data.length; i++) {

            tmpDate = new Date(that.raw_data[i]['created_at']);

            if (tmpDate.getDate() === that.dayOfMonth && that.raw_data[i]['status'] === 'complete') {

                console.log("Including execution from date: " + tmpDate + " status : " + that.raw_data[i].status);
                l = Execution(that.raw_data[i].value, tmpDate, that.raw_data[i].endpoint_name);
                that.exes.push(Execution(that.raw_data[i].value, tmpDate, that.raw_data[i].endpoint_name));
                that.executions.push(l.getReducedData());

            } else {

                console.log("Excluding execution from date: " + tmpDate + " status : " + that.raw_data[i].status);
            }

        }

        var byProvider = massageData(that.exes);


        byProvider = JSON.parse(JSON.stringify(byProvider));

        //byProvider contains data that is grouped first by clinic then by provider.

        //iterate through clinics, then by providers.

        var s = "";

        s += "Clinic/Provider,";

        var numExes = byProvider[Object.keys(byProvider)[0]].self.length;

        for (i = 0; i < numExes; i++) {

            s += "Query Date,Count Active Patients,Change in Active Patients,% Change in Active Patients,"

        }

        s += "\n";

        for (var c in byProvider) {

            s += "clinic_" + c + ",";
            s += proc.getSubReport(byProvider[c].self);
            s += "\n";

            if (withProviders) {

                for (var p in byProvider[c]) {

                    if (p === 'self') {
                        continue;
                    }

                    s += "provider_" + p + ",";
                    s += proc.getSubReport(byProvider[c][p]);
                    s += "\n";

                }

            }


        }

        s += getNetwork(byProvider);

        return s;

    };

    var getNetwork = function (data) {

        data = JSON.parse(JSON.stringify(data));

        var totals = [];

        var s = "";
        s += "Network Total,";

        for (var ep in data) {

            for (var ex = 0; ex < data[Object.keys(data)[0]].self.length; ex++) {

                totals[ex] ? totals[ex] += data[ep].self[ex].numerator : totals[ex] = data[ep].self[ex].numerator;

            }

        }

        var ep = Object.keys(data)[0];

        var tmp = null;

        for (var ex = 0; ex < totals.length; ex++) {

            //execution date
            tmp = new Date(data[ep].self[ex].time * 1000);
            s += tmp.getFullYear() + "-";
            s += tmp.getMonth() + "-";
            s += tmp.getDate();
            s += ",";

            s += totals[ex] + ",";

            if (ex === 0) {

                s += "0,0,";

            } else {

                s += (totals[ex] - totals[ex - 1]) + ",";
                s += (100 * ((totals[ex] - totals[ex - 1]) / totals[ex - 1])) + ",";

            }

        }

        s += "\n";

        return s;

    };

    var getSubReport = function (input) {

        // input has [ { time, endpoint, data : { gender : { age_range : XX } } }, ... ]

        var s = "";

        if (input.length <= 0) {
            return "";
        }


        input = JSON.parse(JSON.stringify(input));

        var tmp = null;

        for (i = 0; i < input.length; i++) {

            //clinic name

            //execution date
            tmp = new Date(input[i].time * 1000);
            s += tmp.getFullYear() + "-";
            s += tmp.getMonth() + "-";
            s += tmp.getDate();
            s += ",";

            //Count Active Patients
            s += input[i].numerator + ",";

            if (i === 0) {

                //both change and % change must be zero for first execution.
                s += "0,0,";

            } else {

                //change
                s += (input[i].numerator - input[i - 1].numerator) + ",";

                s += (100 * ((input[i].numerator - input[i - 1].numerator) / (input[i - 1].numerator))) + ",";

            }


        }

        return s;

    };

    that.getReport = getReport;

    proc.getSubReport = getSubReport;

    return that;
};

module.exports = {AttachedActivePatientReport: AttachedActivePatientReport};