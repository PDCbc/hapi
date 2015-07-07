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

            if (!toReturn[data[e].endpoint]) {

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

                console.log(toReturn[tmp.endpoint][c]);
                if (toReturn[tmp.endpoint][c] === undefined) {

                    toReturn[tmp.endpoint][c] = [];

                }
                toReturn[tmp.endpoint][c].push({
                    time       : tmp.time,
                    numerator  : tmp.data[c].numerator,
                    denominator: tmp.data[c].denominator
                });

                console.log(util.inspect(toReturn, false, null));

            }

        }


        console.log(util.inspect(toReturn, false, null));
        return toReturn;


    };

    var getReport = function () {

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

        for (var p in byProvider) {


        }

        return "";

        for (var e = 0; e < that.executions.length; e++) {

            if (!that.clinicData[that.executions[e].endpoint]) {

                that.clinicData[that.executions[e].endpoint] = [];

            }

            that.clinicData[that.executions[e].endpoint].push(that.executions[e]);

        }

        //that.clinicData now contains executions grouped by clinic.

        console.log(util.inspect(that.exes, false, null));

        for (var k in that.clinicData) {

            if (that.clinicData.hasOwnProperty(k)) {

                that.clinicData[k].sort(function (a, b) {

                    if (a.time > b.time) {

                        return 1;

                    } else if (a.time < b.time) {

                        return -1;

                    } else {

                        return 0;

                    }

                });

            }

        }

        //now sort by time stamp, the lowest time stamp should be first.

        that.clinicData = JSON.parse(JSON.stringify(that.clinicData));

        var s = "";

        s += "Clinic,";

        for (i = 0; i < that.clinicData[Object.keys(that.clinicData)[0]].length; i++) {

            s += "Query Date,Count Active Patients,Change in Active Patients,% Change in Active Patients,"

        }

        s += "\n";

        for (var e in that.clinicData) {

            s += proc.getSubReport(that.clinicData[e]);

        }

        s += getNetwork(that.clinicData);

        s += "\n";

        return s;

    };

    var getNetwork = function (data) {

        data = JSON.parse(JSON.stringify(data));

        var totals = [];

        var s = "";
        s += "\nNetwork Total,";

        for (var ep in data) {

            for (var ex = 0; ex < data[Object.keys(data)[0]].length; ex++) {

                totals[ex] ? totals[ex] += data[ep][ex].data.numerator : totals[ex] = data[ep][ex].data.numerator;

            }

        }

        var ep = Object.keys(data)[0];

        var tmp = null;

        for (var ex = 0; ex < totals.length; ex++) {

            //execution date
            tmp = new Date(data[ep][ex].time * 1000);
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

        s += input[0].endpoint + ",";

        for (i = 0; i < input.length; i++) {

            //clinic name

            //execution date
            tmp = new Date(input[i].time * 1000);
            s += tmp.getFullYear() + "-";
            s += tmp.getMonth() + "-";
            s += tmp.getDate();
            s += ",";

            //Count Active Patients
            s += input[i].data.numerator + ",";

            if (i === 0) {

                //both change and % change must be zero for first execution.
                s += "0,0,";

            } else {

                //change
                s += (input[i].data.numerator - input[i - 1].data.numerator) + ",";

                s += (100 * ((input[i].data.numerator - input[i - 1].data.numerator) / (input[i - 1].data.numerator))) + ",";

            }


        }

        return s;

    };

    that.getReport = getReport;

    proc.getSubReport = getSubReport;

    return that;
};

module.exports = {AttachedActivePatientReport: AttachedActivePatientReport};