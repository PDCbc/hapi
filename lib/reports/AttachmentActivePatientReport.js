'use strict';

var logger  = require('../logger').Logger("AttachmentActivePatientReport", 1);
var util    = require("util")
var TimedReport  = require('./TimedReport').TimedReport;

//This is the date of the month that we will report our results with respect to.
var QUERY_DATE = 7;

/**
* A specific AttachmentActivePatientReport object that is meant to produce
* a report specific to the attachment reporting requirements. 
* 
* Inherits functionality from the Report object, this function should only
* implement functionality specific to generating output that is formatted for
* the specific attachment tabular reporting requirements.
* 
* This report hardcodes the queries that the report depends on.
* 
* The relationship between the Report and AttachmentActivePatientReport objects is
* an example of the Functional Pattern presented in the book: 
*   "JavaScript: The Good Parts" by Douglas Crockford.
*
* @param shortName {String} - A string that that can be used in a URL (no spaces, or special characters).
* @param name {String} - A string that describes the report.
* @param proc {Object} - An object that contains any protected variables or methods. If this is not
*       passed it will default to a new object, and will be passed to Report() and will contain protected
*       methods/variables that are accessible to the AttachmentActivePatientReport object, but should not
*       be made publicly accessible. 
* 
* @return {Object} - an object that contains public functions and variables.
*/
var AttachmentActivePatientReport = function(shortName, name, proc){

    //initialize protected variables.
    proc = proc || {}; 

    //Inherit methods from the parent object. Protected methods/variables
    //will be available via the proc object after this function is called.
    //the that variable will contain the public methods/variables from
    //Report object.
    //
    var that = TimedReport(shortName, name, ["PDC-1738"], proc);


    /**
    * Generates a CSV string that can be returned as the report.
    *
    * @param data {Object} - An object that contains the data to present in a report, has structure like:
    *       [ {title:'PDC-XXX', result:{ clinician : [ { aggregate_result : { ... }, time : "TIMESTAMP" }, ... ] }, ...]
    * 
    * @return {String} - A CSV formatted string that can be returned to the caller. If the report could not be generated
    *      then null is returned.
    *
    */
    var generateCSVReport = function(data){

        var s = "";

        if( !data || !data['PDC-1738']){

            return null;

        }

        data = data['PDC-1738'];

        // check that all of the fields are there.
        if( !data || !data.clinician || !data.group || !data.network || !data.anonymous ){

            return null;

        }

        //store in locals to make the code easier to think about.
        var clinician   = data.clinician;
        var group       = data.group || data.clinic;
        var network     = data.network;
        var anonymous   = data.anonymous;

        //get the first execution that is one the designated date.
        var cStart = proc.getOldestExecutionOnDay(clinician, QUERY_DATE);
        var gStart = proc.getOldestExecutionOnDay(group, QUERY_DATE);
        var nStart = proc.getOldestExecutionOnDay(network, QUERY_DATE);

        //check that the start dates all line up.
        if( cStart.time !== gStart.time || cStart.time !== nStart.time ){

           return null;

        }

        //get the series of month seperated execution results.
        clinician   = proc.getExecutionsSeparatedByOneMonth(cStart, clinician);
        group       = proc.getExecutionsSeparatedByOneMonth(gStart, group);
        network     = proc.getExecutionsSeparatedByOneMonth(nStart, network);

        //check that we have the same number of executions for each part of the report
        if( clinician.length !== group.length  || clinician.length !== network.length ){

           return null

        }

        var numExecutions = clinician.length;


        //start building up the CSV string.

        s+= "Entity,";

        //loop over and generate headers
        for( var i = 0; i < numExecutions; i++ ){

            s += "Date Query Executed,";
            s += "Total Active Patients,";
            s += "Change in Active Patients,";
            s += "% Change in Active Patients,";

        }

        s += "\n";

        //add the clinician info to the CSV string.

        s += "YOU (user),";

        var change = null;
        var percent_change = null;
        var tmp = null;
        var tmpDate = null;

        for( var i = 0; i < numExecutions; i++ ){

            change = null;
            percent_change = null;

            //special case, change in active patient is N/A b/c we
            // have nothing to reference a change against.
            if( i === 0){

                change = "N/A";
                percent_change = "N/A";

            }else{

                tmp = proc.getDeltas(clinician[i-1], clinician[i]);
                change = tmp.delta.numerator;
                percent_change = 100*(tmp.delta.numerator / clinician[i-1].aggregate_result.numerator);

            }

            tmpDate = new Date(clinician[i].time * 1000 );

            s += tmpDate.getFullYear()+"-"+(tmpDate.getMonth()+1)+"-"+tmpDate.getDate()+",";
            s += clinician[i].aggregate_result.numerator+",";
            s += change+",";
            s += percent_change+" %,";

        }

        s += "\n";

        s += group[0].display_name+",";

        change = null;
        percent_change = null;
        tmp = null;
        tmpDate = null;

        for( i = 0; i < numExecutions; i++ ){

            change = null;
            percent_change = null;

            //special case, change in active patient is N/A b/c we
            // have nothing to reference a change against.
            if( i === 0){

                change = "N/A";
                percent_change = "N/A";

            }else{

                tmp = proc.getDeltas(group[i-1], group[i]);
                change = tmp.delta.numerator;
                percent_change = 100*(tmp.delta.numerator / group[i-1].aggregate_result.numerator);

            }

            tmpDate = new Date(group[i].time * 1000 );

            s += tmpDate.getFullYear()+"-"+(tmpDate.getMonth()+1)+"-"+tmpDate.getDate()+",";
            s += group[i].aggregate_result.numerator+",";
            s += change+",";
            s += percent_change+" %,";

        }

        s += "\n";

        //add anonymous provider data to the CSV.

        anonymous = JSON.parse(JSON.stringify(anonymous));

        i = 0;
        var tmpStart = null;
        var tmpData  = null;
        var j = 0;

        for( var k in anonymous ){

            tmpStart = proc.getOldestExecutionOnDay(anonymous[k], QUERY_DATE);
            tmpData = proc.getExecutionsSeparatedByOneMonth(tmpStart, anonymous[k]);

            if(tmpData.length !== numExecutions ){

                logger.warn("Executions of anonymous provider "+ k +" do not align with executions for current clinician, ignoring.");
                continue;

            }else{

                change = null;
                percent_change = null;
                tmp = null;
                tmpDate = null;

                s += "Group Member "+ i +",";

                for( j = 0; j < numExecutions; j++ ){

                    change = null;
                    percent_change = null;

                    //special case, change in active patient is N/A b/c we
                    // have nothing to reference a change against.
                    if( j === 0){

                        change = "N/A";
                        percent_change = "N/A";

                    }else{

                        tmp = proc.getDeltas(anonymous[k][j-1], anonymous[k][j]);
                        change = tmp.delta.numerator;
                        percent_change = 100*(tmp.delta.numerator / anonymous[k][j-1].aggregate_result.numerator);

                    }

                    tmpDate = new Date(group[i].time * 1000 );

                    s += tmpDate.getFullYear()+"-"+(tmpDate.getMonth()+1)+"-"+tmpDate.getDate()+",";
                    s += anonymous[k][j].aggregate_result.numerator+",";
                    s += change+",";
                    s += percent_change+" %,";

                }

                s += "\n";

            }

            i += 1;

        }

        s += network[0].display_name+",";

        change = null;
        percent_change = null;
        tmp = null;
        tmpDate = null;

        for( i = 0; i < numExecutions; i++ ){

            change = null;
            percent_change = null;

            //special case, change in active patient is N/A b/c we
            // have nothing to reference a change against.
            if( i === 0){

                change = "N/A";
                percent_change = "N/A";

            }else{

                tmp = proc.getDeltas(network[i-1], network[i]);
                change = tmp.delta.numerator;
                percent_change = 100*(tmp.delta.numerator / network[i-1].aggregate_result.numerator);

            }

            tmpDate = new Date(network[i].time * 1000 );

            s += tmpDate.getFullYear()+"-"+(tmpDate.getMonth()+1)+"-"+tmpDate.getDate()+",";
            s += network[i].aggregate_result.numerator+",";
            s += change+",";
            s += percent_change+" %,";

        }

        s += "\n";

        return s;

    };

    proc.generateCSVReport = generateCSVReport; 


    return that;

}

module.exports = {AttachmentActivePatientReport : AttachmentActivePatientReport};