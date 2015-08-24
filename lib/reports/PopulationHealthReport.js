/**
 * Created by sdiemert on 15-08-17.
 */

'use strict';

var logger         = require('../logger').Logger("PopulationHealthReport", 1);
var util           = require("util");
var FlexibleReport = require('./FlexibleReport').FlexibleReport;

/**
 * A specific PopulationHealthReport object that is meant to produce
 * a report specific to the population health reporting requirements.
 *
 * Inherits functionality from the Report object, this function should only
 * implement functionality specific to generating output that is formatted for
 * the specific population health tabular reporting requirements.
 *
 * This report hardcodes the queries that the report depends on.
 *
 * The relationship between the Report and PopulationHealthReport objects is
 * an example of the Functional Pattern presented in the book:
 *   "JavaScript: The Good Parts" by Douglas Crockford.
 *
 * @param shortName {String} - A string that that can be used in a URL (no spaces, or special characters).
 * @param name {String} - A string that describes the report.
 * @param depends {Array} - An array of query ids (PDC-XXX) that this report should depend on.
 * @param proc {Object} - An object that contains any protected variables or methods. If this is not
 *       passed it will default to a new object, and will be passed to Report() and will contain protected
 *       methods/variables that are accessible to the PopulationHealthReport object, but should not
 *       be made publicly accessible.
 *
 * @return {Object} - an object that contains public functions and variables.
 */
var PopulationHealthReport = function (shortName, name, depends, proc) {

    //initialize protected variables.
    proc = proc || {};

    //Inherit methods from the parent object. Protected methods/variables
    //will be available via the proc object after this function is called.
    //the that variable will contain the public methods/variables from
    //Report object.
    //
    var that = FlexibleReport(shortName, name, depends, proc);

    /**
     * Generates a CSV string that can be returned as the report.
     *
     * @param data {Object} - An object that contains the data to present in a report, has structure like:
     *       [{title:'PDC-XXX', result:{ clinician : [ { aggregate_result : { ... }, time : "TIMESTAMP" }, ... ] }, ...]
     *
     * @param metadata {Object} - Contains meta-data about reports.
     *
     * @return {String} - A CSV formatted string that can be returned to the caller. If no data is provided to this function
     *       a template string is returned.
     */
    var generateCSVReport = function (data, metadata) {

        var s = that.name + "\n";

        s += "Query Identifier,Metric Title,Description,Query Executed,% Patients,Numerator,Denominator,Target,Reference\n";

        var k    = null;
        var num  = null;
        var den  = null;
        var time = null;

        logger.warn(util.inspect(data, false, null));
        logger.success(util.inspect(metadata, false, null));


        for (var q = 0; q < proc.depends.length; q++) {

            k = proc.depends[q];

            s += k + ",";

            if (metadata[k] && metadata[k].title) {
                s += '"' + metadata[k].title + '"' + ","
            } else {
                s += "N/A,"
            }

            if (metadata[k] && metadata[k].description) {
                s += '"' + metadata[k].description + '"' + ","
            } else {
                s += "N/A,"
            }

            if (data[k] && data[k]['clinician']) {

                time = data[k]['clinician'][data[k]['clinician'].length - 1].time;

                if (!time) {
                    s += "N/A,"
                } else {

                    time = new Date(time * 1000);

                    s += time.getFullYear() + "-" + (time.getMonth() + 1) + "-" + time.getDate() + ","

                }

                num = data[k]['clinician'][data[k]['clinician'].length - 1].aggregate_result.numerator;
                den = data[k]['clinician'][data[k]['clinician'].length - 1].aggregate_result.denominator;

                //both num and den are allowed to be zeros
                if (
                    num === null ||
                    num === undefined ||
                    den === null ||
                    den === undefined
                ) {

                    s += "N/A,N/A,N/A,";

                } else {

                    //make sure we don't divide by zero
                    if (den !== 0) {

                        s += ((num / den) * 100).toFixed(2) + "," + num.toFixed(2) + "," + den.toFixed(2) + ",";

                    } else {

                        s += "DIV 0 ERR," + num + "," + den + ",";

                    }


                }

                if (metadata[k].target && metadata[k].target.value) {

                    s += '"' + metadata[k].target.value + '"' + ","

                } else {

                    s += "N/A,";

                }

                if (metadata[k].target && metadata[k].target.reference) {

                    s += '"' + metadata[k].target.reference + '"' + ","

                } else {

                    s += "N/A,";

                }

                s += "\n";

            } else {

                s += "NO DATA\n";

            }
        }

        return s;

    };

    proc.generateCSVReport = generateCSVReport;


    return that;

};

module.exports = {PopulationHealthReport: PopulationHealthReport};
