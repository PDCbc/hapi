var logger = require('../logger').Logger("TimedReport", 1);
var util   = require("util");
var Report = require('./Report');

/**
 * A TimedReport object that provides an abstract implementation
 * of a report that can be extended to generate reports that
 * show changes in time.
 *
 * Inherits functionality from the Report object.
 *
 * The relationship between the Report and TimedReport objects is
 * an example of the Functional Pattern presented in the book:
 *   "JavaScript: The Good Parts" by Douglas Crockford.
 *
 * @param shortName {String} - A string that that can be used in a URL (no spaces, or special characters).
 * @param name {String} - A string that describes the report.
 * @param dependancies {Array} - An array of strings that represent queries in the db that this report depends before it can be executed.
 * @param proc {Object} - An object that contains any protected variables or methods. If this is not
 *       passed it will default to a new object, and will be passed to Report() and will contain protected
 *       methods/variables that are accessible to the TimedReport object, but should not
 *       be made publicly accessible.
 *
 * @return {Object} - an object that contains public functions and variables.
 */
var TimedReport = function (shortName, name, dependancies, proc) {

    //initialize protected variables.
    proc = proc || {};

    //Inherit methods from the parent object. Protected methods/variables
    //will be available via the proc object after this function is called.
    //the that variable will contain the public methods/variables from
    //Report object.
    //
    var that = Report.Report(shortName, name, dependancies, proc);


    /**
     * Determines the change of all values within the
     * 'aggregate_result' object between objects a and b. Where
     * the change is defined as a - b (a subtract b)
     *
     * @param a {Object} - An object that has a aggregate_result field containing an object
     *   with fields and numbers. Has structure like:
     *   { aggregate_result : { field1: Number, field2 : Number, field3 : Number, ...} }
     *
     * @param b {Object} - An object that has a aggregate_result field containing an object
     *   with fields and numbers. Has structure like:
     *   { aggregate_result : { field1: Number, field2 : Number, ...} }
     *
     * @return {Object} - An object that contains the deltas for fields that are similar between
     *   parameters a and b. Has structure like:
     *   { delta : { field1: Number, field2: Number } }
     *   Returns null if there was an error or was unable to compute deltas.
     */
    var getDeltas = function (a, b) {

        if (!a || !b || !a.aggregate_result || !b.aggregate_result) {

            return null;

        }

        //JavaScript hack for removing fields that might 
        // be stuck up the prototype chain.
        a = JSON.parse(JSON.stringify(a));
        b = JSON.parse(JSON.stringify(b));

        var r = {delta: {}};

        for (var ka in a.aggregate_result) {

            for (var kb in b.aggregate_result) {

                if (ka === kb) {

                    r.delta[ka] = b.aggregate_result[kb] - a.aggregate_result[ka];

                }

            }

        }

        return r;

    };

    /**
     * Attmepts to find an execution object that was executed near the timeFrame indicated by the parameter
     * from the previous execution. For example, if we wish to find an execution that is 1 month (28 days, 2419200 seconds) from the current one
     * we would call findNextTimedExecution( currentExe, 2419200, allExes, 259200 ).
     *
     * @param currentExe {Object} - The current execution object, must contain a time field with a timestamp in seconds from epoch.
     * @param allExes {Array} - An array of executions to search through.
     * @param timeFrame {Number} - The number of seconds apart the returned execution should be from the currentExe. Defaults to 30 days.
     * @param threshold {Number} - The number of seconds to extend the the timeFrame by. Can't make it exact b/c we would likel
     *      fail to match the timeFrame exactly. Defualt is 2 days.
     *
     * @return {Object} - Returns the execution object that was found. In the case of multiple execution objects being found the one
     *  closest to the timeFrame will be chosen. If there no execution could be found or there was error null is returned.
     */
    var findNextTimedExecution = function (currentExe, allExes, timeFrame, threshold) {

        //set default values for those params that were not provided.
        currentExe = currentExe || {};
        timeFrame  = timeFrame || 2592000;
        allExes    = allExes || [];
        threshold  = threshold || 172800;

        //check for invalid inputs.
        if (!currentExe || !currentExe.time || !allExes ||
            allExes.length === 0 ||
            typeof timeFrame !== "number" ||
            typeof threshold !== "number"
        ) {

            return null;

        }

        var possibleExes = [];
        var tmp = null;

        for (var i = 0; i < allExes.length; i++) {

            //check that the exe we are looking at has a valid time
            if (!allExes[i].time) {
                continue;

            }

            //check that we are looking at an execution that is AFTER the current one.
            if ((allExes[i].time - currentExe.time) <= 0) {
                continue;

            }

            tmp = allExes[i].time - currentExe.time;
	    
            //determine if we are inside the window.
            if (tmp <= (timeFrame + threshold) && tmp >= (timeFrame - threshold)) {

                possibleExes.push(allExes[i]);

            }
        }

        if (possibleExes.length === 0) {

            //we did not find any executions that match.
            return null;

        } else if (possibleExes.length === 1) {

            //we only found on execution, return it.
            return possibleExes[0];

        } else {

            //we need to find the execution that is closest to the timeFrame.

            var closestExe = null;
            var minTimeDiff = Number.POSITIVE_INFINITY;
            tmp = null;

            for (var i = 0; i < possibleExes.length; i++) {

                tmp = Math.abs(possibleExes[i].time - (currentExe.time + timeFrame));

                if (tmp <= minTimeDiff) {

                    closestExe = possibleExes[i];
                    minTimeDiff = tmp;

                }

            }

            //at the end of this loop we have the closest value.
            return closestExe;

        }

    };

    /**
     * Finds executions that are seperated by 1 month starting from the start execution.
     *
     * @param start {Object} - An execution object to start from, will look for other objects with respect to this one.
     * @param exes {Array} - An array of execution objects to search through.
     *
     * @return {Array} - An array of execution objects (including the start execution) that are seperated by approximately 30 days.
     *      Approximately 30 days because months are differing lengths, using threshold to compute months.
     *      Returns null if there was an error or could find an other executions.
     */
    var getExecutionsSeparatedByOneMonth = function (start, exes) {

        if (!start || !start.time || !exes || !exes.length) {

            return null;

        }

        var current = start;

        var toReturn = [];

        while (current) 
	{
            toReturn.push(current);
            current = findNextTimedExecution(current, exes, 2592000, 172800);
        }

        //check if we found any matches.
        //check against 1 because we know that the start execution is in the array by default.
        if (toReturn.length < 1) {

            return null;

        } else {

            return toReturn;

        }


    };

    /**
     * Finds the execution object that is the oldest that has a day number matching the dayNum parameter.
     *
     * @param exes {Array} - The array of executions to search through
     * @param dayNum {Number} - The day number of the month to look for (e.g. 1 for the 1st of the month).
     *      Valid range is 1 through 31.
     *
     * @return {Object} an execution object. Returns null if no matching execution could be found or there was error.
     */
    var getOldestExecutionOnDay = function (exes, dayNum) {

        if (!exes || !exes.length || !dayNum || dayNum < 1 || dayNum > 31) {

            return null;

        }

        var minDate = new Date();
        var minExe = null;
        var tmpDate = null;

        for (var i = 0; i < exes.length; i++) {

            //check that we have a valid execution time.
            if (!exes[i].time || typeof exes[i].time !== "number") {

                continue;

            }


            //wrap date parsing in try/catch in case it throws an error.
            try {

                tmpDate = new Date(Math.floor(exes[i].time * 1000));

                //check that input was parsed correcly.
                if (isNaN(tmpDate.getDate())) {

                    continue;
                }

                //check if the date is the right day of the month.
                if (tmpDate.getDate() === dayNum) 
		{	
			if (tmpDate.getTime() <= minDate.getTime()) 
			{
			    minDate = new Date(tmpDate.getTime());
                    	    minExe  = exes[i];
                    	    minTime = exes[i].time;
			}
                }

            } catch (e) {

                logger.error(util.inspect(e));
                logger.error(e.stack);

                //if we get an error it likely means we parsed a date wrong, ignore this.
                continue;
            }

        }

        return minExe;

    };

    /**
     * Generates a CSV string that can be returned as the report.
     *
     * @param data {Object} - An object that contains the data to present in a report, has structure like:
     *       [ {title:'PDC-XXX', result:{ clinician : [ { aggregate_result : { ... }, time : "TIMESTAMP" }, ... ] }, ...]
    * 
     * @return {String} - A CSV formatted string that can be returned to the caller. If no data is provided to this function
     *       a template string is returned.
     */
    var generateCSVReport = function (data) {

        //this will thrown an unimplemented error since this report type
        // is meant to be abstract, meaning that a sub-object must
        // implement the details of how to generate a CSV string.
        throw {

            name: "UnimplementedMethodError",
            message: "The method TimedReport.generateCSVReport is an abstract method that must be implemented by a sub-object."

        };

    };

    //protected methods
    proc.generateCSVReport                = generateCSVReport;
    proc.getDeltas                        = getDeltas;
    proc.findNextTimedExecution           = findNextTimedExecution;
    proc.getExecutionsSeparatedByOneMonth = getExecutionsSeparatedByOneMonth;
    proc.getOldestExecutionOnDay          = getOldestExecutionOnDay;


    //public methods


    return that;

};

module.exports = {TimedReport: TimedReport};
