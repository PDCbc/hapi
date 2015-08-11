/**
 * Created by sdiemert on 2015-07-03
 *
 * Generates a report that shows the Third Next Available Appointment
 * for each clinic and provider.
 *
 * This report should only be used to generate master reports
 * upon request from PDC administrators. It is not meant to be
 * used by the normal HAPI webservice.
 */


var util   = require("util");
var logger = require('../logger.js').Logger("AttachedActivePatientsReport", 1);


var ThirdNextReport = function (data, dayOfMonth, proc) {

    var that = {};

    proc = proc || {};

    proc.data       = data;
    proc.dayOfMonth = parseInt(dayOfMonth);

    proc.dayOfWeek = parseInt(dayOfMonth);

    console.log(proc);

    /**
     * @param data {Object} - { clinic : XXX, date : XXXX, clinicians : [ { clinician : XXXX, 3rdnext: XXX } ] }
     *
     * @return {Object} - { date : XXXX, average: XXXX, min : XXXX, max : XXXX, stdev : XXXX, coeff : XXXX }
     */
    var computeStats = function (data) {

        var toReturn = {date: null, average: null, min: null, max: null, stddev: null, coeff: null};

        toReturn.date = data.date;

        var minVal = Number.POSITIVE_INFINITY;
        var maxVal = Number.NEGATIVE_INFINITY;
        var sum    = 0;
        var count  = 0;

        var vals = data.clinicians;

        for (var i = 0; i < vals.length; i++) {

            if (vals[i]['3rdnext'] < minVal) {

                minVal = vals[i]['3rdnext'];

            }

            if (vals[i]['3rdnext'] > maxVal) {

                maxVal = vals[i]['3rdnext'];

            }

            sum += vals[i]['3rdnext'];
            count += 1;

        }

        toReturn.min     = minVal;
        toReturn.max     = maxVal;
        toReturn.sum     = sum;
        toReturn.average = (sum / count);


        sum = 0;
        for (var i = 0; i < vals.length; i++) {

            sum = Math.pow((vals[i]['3rdnext'] - toReturn.average), 2);

        }

        toReturn.stddev = sum / count;
        toReturn.coeff  = toReturn.stddev / toReturn.average;

        return toReturn;

    };

    var groupByClinic = function (data) {

        var toReturn = {};

        for (var i = 0; i < data.length; i++) {

            if (!(data[i].clinic in toReturn)) {

                toReturn[data[i].clinic] = [];

            }

            toReturn[data[i].clinic].push(computeStats(data[i]));

        }

        return toReturn;

    };

    var getClinicLevelReport = function (data) {

        var clinics = groupByClinic(data);

        clinics = JSON.parse(JSON.stringify(clinics));

        for (var c in clinics) {

            //sort the executions.
            clinics[c] = clinics[c].sort(function (x, y) {

                if (x.date > y.date) {
                    return 1;
                } else if (x.date < y.date) {
                    return -1
                } else {
                    return 0;
                }

            });

            //filter out executions from dates that are not
            // on the required day of the month.

            clinics[c] = clinics[c].filter(function (val) {

                var tmp = new Date(val.date * 1000);

                if (tmp.getDay() !== proc.dayOfMonth) {
                    logger.info("Filtering out record, had date: " + tmp + " not " + proc.dayOfMonth + " as wanted.");
                    return false;
                }

                logger.info("Keeping record with date: " + tmp);
                return true;

            });

            for (var r in clinics[c].clinicians) {

                if (clinics[c].clinicians[r]['3rdnext'] === -1) {

                    clinics[c].clinicians[r]['3rdnext'] = 128;

                }

            }

        }


        //data now structured by clinic, each clinic has executions sorted and filtered.
        console.log(clinics);

        var s = "Clinic ID,";

        var numExes = clinics[Object.keys(clinics)[0]].length;

        for (var i = 0; i < numExes; ++i) {

            s += "Query Date,Average(Days),Range (min) (days),Range (max) (days),Co-efficient of Variation(%),";

        }

        s += "\n";

        var tmpDate = null;

        var totals = [];

        for (c in clinics) {

            s += c + ",";

            for (var e = 0; e < clinics[c].length; e++) {

                tmpDate = null;

                console.log(clinics[c][e]);

                if (!totals[e]) {

                    totals[e] = {min: 0, max: 0, average: 0, count: 0, coeff: 0};

                }

                totals[e].min += clinics[c][e].min;
                totals[e].max += clinics[c][e].max;
                totals[e].coeff += clinics[c][e].coeff;
                totals[e].average += clinics[c][e].average;
                totals[e].count += 1;

                tmpDate = new Date(1000 * clinics[c][e].date);

                s += tmpDate.getFullYear() + "-" + (tmpDate.getMonth() + 1) + "-" + tmpDate.getDate() + ",";
                s += clinics[c][e].average.toFixed(2) + ",";
                s += clinics[c][e].min.toFixed(2) + ",";
                s += clinics[c][e].max.toFixed(2) + ",";
                s += (clinics[c][e].coeff * 100).toFixed(2) + ",";
            }
            s += "\n";
        }

        console.log(totals);

        s += 'All Clinics,';

        console.log(totals);

        for (e = 0; e < totals.length; e++) {

            s += "-,";
            s += (totals[e].average / totals[e].count).toFixed(2) + ",";
            s += (totals[e].min / totals[e].count).toFixed(2) + ",";
            s += (totals[e].max / totals[e].count).toFixed(2) + ",";
            s += (totals[e].coeff / totals[e].count).toFixed(2) + ",";

        }

        s += "\n";

        return s;
    };

    var getProviderLevelReport = function (data) {

        throw new Error("This report does not support provider level data! The reporting requirements are such that provider level data does not make sense. Please refer to the requirements in Polarian for details.");

    };

    /**
     * @param provider {Boolean} - If this is true, will generate report based on provider level data.
     *      If this param is false, will generate report with anony. physicians.
     * @returns {String} - the report string.
     */
    var getReport = function (provider) {

        logger.warn(util.inspect(data, false, null));

        if (provider === true) {

            return proc.getProviderLevelReport(data);

        } else {

            return proc.getClinicLevelReport(data);

        }

    };

    proc.getProviderLevelReport = getProviderLevelReport;
    proc.getClinicLevelReport   = getClinicLevelReport;

    that.getReport = getReport;

    return that;
};

module.exports = {ThirdNextReport: ThirdNextReport};