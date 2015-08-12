'use strict';

var logger        = require('../logger').Logger("DemographicsReport", 1);
var util          = require("util");
var TimedReport   = require('./TimedReport').TimedReport;
var resultManager = require("../resultManager/DemographicsResultManager.js");

//This is the date of the month that we will report our results with respect to.
var QUERY_DATE = 1;

/**
 * A specific DemographicsReport object that is meant to produce
 * a report specific to the attachment reporting requirements.
 *
 * Inherits functionality from the Report object, this function should only
 * implement functionality specific to generating output that is formatted for
 * the specific attachment tabular reporting requirements.
 *
 * This report hardcodes the queries that the report depends on.
 *
 * The relationship between the Report and DemographicsReport objects is
 * an example of the Functional Pattern presented in the book:
 *   "JavaScript: The Good Parts" by Douglas Crockford.
 *
 * @param shortName {String} - A string that that can be used in a URL (no spaces, or special characters).
 * @param name {String} - A string that describes the report.
 * @param dependancies {Array} - An array of strings that are query titles. These queries must be executed
 *      before we can generate this report.
 * @param proc {Object} - An object that contains any protected variables or methods. If this is not
 *       passed it will default to a new object, and will be passed to Report() and will contain protected
 *       methods/variables that are accessible to the DemographicsReport object, but should not
 *       be made publicly accessible.
 *
 * @return {Object} - an object that contains public functions and variables.
 */
var DemographicsReport = function (shortName, name, dependancies, proc) {

    //initialize protected variables.
    proc = proc || {};

    dependancies = dependancies || ["PDC-001"];

    //Inherit methods from the parent object. Protected methods/variables
    //will be available via the proc object after this function is called.
    //the that variable will contain the public methods/variables from
    //Report object.
    //
    var that = TimedReport(shortName, name, dependancies, proc);

    /**
     * Determines the differences between two executions of the demographics query.
     * Expects data to be in objects as returned by the DemographicsResultManager.
     *
     * @param a {Object} - One object (first in time) Has structure like:
     *      { time: Number, { GENDER : { AGE_RANGE : Number, ...}, ...}
     * @param b {Object} - Second object (more recent in time than a) Has structure like:
     *      { time: Number, { GENDER : { AGE_RANGE : Number, ...}, ...}
     *
     * @return {Object} - An object with the deltas computed as b - a for each field in a and b
     *      that were found to have identical keys.
     *      Returns null if there was invalid input format or an error
     */
    var getDeltas = function (a, b) {

        //check for invalid inputs.
        if (!a || !b) {

            return null;

        }

        // JS hack to remove items from up the prototype chain.
        a = JSON.parse(JSON.stringify(a));
        b = JSON.parse(JSON.stringify(b));

        var toReturn = {};

        for (var genderA in a) {

            for (var genderB in b) {

                if (genderA === genderB) {

                    toReturn[genderA] = {};

                    for (var ka in a[genderA]) {

                        for (var kb in b[genderB]) {

                            if (kb === ka) {

                                toReturn[genderA][ka] = b[genderB][kb] - a[genderA][ka];

                            }

                        }
                    }

                    //if there are no matches between the objects
                    //remote the parent object.
                    if (Object.keys(toReturn[genderA]).length <= 0) {

                        delete toReturn[genderA];

                    }

                }

            }

        }

        if (Object.keys(toReturn).length <= 0) {

            return null;

        } else {

            return toReturn;

        }

    };

    /**
     * Generates the presentation in CSV format in a table. Related to tabular
     * reporting requirements for demographics reports.
     *
     * @param data {Object}
     * @returns {String}
     */
    var tableForSingleDataSet = function (data) {

        var s = "";
        s += "age category,gender,";

        var tmp = null;
        for (var i = 0; i < data.length; i++) {

            tmp = new Date(data[i].time * 1000);
            s += tmp.getFullYear() + "-" + (1 + tmp.getMonth()) + "-" + tmp.getDate();
            s += ",";

        }

        s += "\n";

        var ageRanges = null;
        var genders   = null;


        //hack the JS object to remove prototype
        data = JSON.parse(JSON.stringify(data));

        try {

            ageRanges = Object.keys(data[0][Object.keys(data[0])[0]]);
            genders   = Object.keys(data[0]);

        } catch (e) {

            logger.error("Failed to index into results: " + util.inspect(e));
            logger.error(e.stack);
            return null;

        }

        if (!ageRanges || !genders) {

            return null;

        }

        var totals       = [];
        var masterTotals = [];

        for (var r = 0; r < ageRanges.length; r++) {

            s += ageRanges[r] + ",";

            totals = [];

            for (var g = 0; g < genders.length; g++) {

                if (resultManager.SUPPORTED_GENDERS.indexOf(genders[g]) < 0) {

                    continue;

                }

                s += genders[g] + ",";

                for (var e = 0; e < data.length; e++) {

                    s += data[e][genders[g]][ageRanges[r]] + ",";
                    totals[e] ? totals[e] += data[e][genders[g]][ageRanges[r]] : totals[e] = data[e][genders[g]][ageRanges[r]];

                }

                s += "\n";
                s += ","

            }

            s += "Total all genders,";

            for (var i = 0; i < totals.length; i++) {

                s += totals[i] + ",";

                masterTotals[i] ? masterTotals[i] += totals[i] : masterTotals[i] = totals[i];

            }

            s += "\n";

        }

        //put in the final totals.
        s += ",Grand Total,";
        for (var i = 0; i < masterTotals.length; i++) {

            s += masterTotals[i] + ",";

        }

        s += "\n";

        return s;
    };

    /**
     * Generates a CSV string that can be returned as the report.
     *
     * @param data {Object} - An object that contains the data to present in a report, has structure like:
     *       [ {title:'PDC-XXX', result:{ clinician : [ { aggregate_result : { ... }, time : "TIMESTAMP" }, ... ] }, ...]
     *
     * @return {String} - A CSV formatted string that can be returned to the caller. If the report could not be generated
     *      then null is returned.
     */
    var generateCSVReport = function (data) {

        var s = "";

        if (!data || !data[dependancies[0]]) {

            return null;

        }

        data = data[dependancies[0]];

        // check that all of the fields are there.
        if (!data || !data.clinician || !data.group || !data.network) {

            return null;

        }

        //store in locals to make the code easier to think about.
        var clinician = data.clinician;
        var group     = data.group || data.clinic;
        var network   = data.network;
        var anonymous = data.anonymous;

        //get the first execution that is one the designated date.
        var cStart = proc.getOldestExecutionOnDay(clinician, proc.QUERY_DATE);
        var gStart = proc.getOldestExecutionOnDay(group, proc.QUERY_DATE);
        var nStart = proc.getOldestExecutionOnDay(network, proc.QUERY_DATE);

        if (!cStart || !gStart || !nStart) {

            return null;

        }

        //check that the start dates all line up.
        if (cStart.time !== gStart.time || cStart.time !== nStart.time) {

            return null;

        }

        //get the series of month seperated execution results.
        clinician = proc.getExecutionsSeparatedByOneMonth(cStart, clinician);
        group     = proc.getExecutionsSeparatedByOneMonth(gStart, group);
        network   = proc.getExecutionsSeparatedByOneMonth(nStart, network);

        //check that we have the same number of executions for each part of the report
        if (clinician.length !== group.length || clinician.length !== network.length) {

            return null

        }

        //start building up the CSV string.


        s += " YOU(user)\n";
        //our string now has dates across the top.
        s += proc.tableForSingleDataSet(clinician);

        s += "\nClinic\n";
        s += proc.tableForSingleDataSet(group);

        s += "\nNetwork\n";
        s += proc.tableForSingleDataSet(network);

        s += "\n";

        return s;

    };

    proc.getDeltas             = getDeltas;
    proc.generateCSVReport     = generateCSVReport;
    proc.QUERY_DATE            = QUERY_DATE;
    proc.tableForSingleDataSet = tableForSingleDataSet;

    return that;

};

module.exports = {DemographicsReport: DemographicsReport};