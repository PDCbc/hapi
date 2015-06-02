'use strict';

var logger  = require('../logger').Logger("StatinsReport", 1); 
var util    = require("util"); 
var Report  = require('./Report')

/**
* A specific StatinsREport object that is meant to produce 
* a report specific to the statin prevention reporting requirements.
* 
* Inherits functionality from the Report object, this function should only
* implement functionality specific to generating output that is formatted for
* the specific statin prevention tabular reporting requirements. 
* 
* This report hardcodes the queries that the report depends on.
* 
* The relationship between the Report and StatinsReport objects is 
* an example of the Functional Pattern presented in the book: 
*   "JavaScript: The Good Parts" by Douglas Crockford.
*
* @param shortName {String} - A string that that can be used in a URL (no spaces, or special characters).
* @param name {String} - A string that describes the report.
* @param proc {Object} - An object that contains any protected variables or methods. If this is not
*       passed it will default to a new object, and will be passed to Report() and will contain protected
*       methods/variables that are accessible to the StatinsReport object, but should not 
*       be made publicly accessible. 
* 
* @return {Object} - an object that contains public functions and variables.
*/
var StatinsReport = function(shortName, name, proc){
    
    //initialize protected variables.
    proc = proc || {}; 

    //Inherit methods from the parent object. Protected methods/variables
    //will be available via the proc object after this function is called.
    //the that variable will contain the public methods/variables from
    //Report object.
    //
    var that = Report.Report(shortName, name, ["PDC-057", "PDC-058", "PDC-1178"], proc);


    /**
    * Generates a CSV string that can be returned as the report.
    *
    * @param data {Object} - An object that contains the data to present in a report, has structure like:
    *       [ {title:'PDC-XXX', result:{ clinician : [ { aggregate_result : { ... }, time : "TIMESTAMP" }, ... ] }, ...]
    * 
    * @return {String} - A CSV formatted string that can be returned to the caller. If no data is provided to this function
    *       a template string is returned. 
    */
    var generateCSVReport = function(data){
        
        var fields = ["clinician", "group", "network"];

        var s = "";

        //set up headers,
        s += ",Active patients >= 65 yrs,% Active patients >= 65 yrs, Active Patients >= 65 yrs on statins for primary prevention,%  Active Patients >= 65 yrs on statins for primary prevention, Active Patients >= 65 yrs on statins for secondary prevention,%  Active Patients >= 65 yrs on statins for secondary prevention\n"; 

        //check for invalid input data.
        if( !data ){
            //return just headers if there is no data.
            return s; 
        }

        var num = null;
        var den = null;
        var f = null; 

        for( var i = 0; i < fields.length; i++ ){

            f = fields[i];

            s += f+",";

            num = data['PDC-1178'][f][data['PDC-1178'][f].length - 1]["aggregate_result"]["numerator"];
            den = data['PDC-1178'][f][data['PDC-1178'][f].length - 1]["aggregate_result"]["denominator"];

            s += num+",";
            s += ((num/den)*100)+",";

            num = data['PDC-057'][f][data['PDC-057'][f].length - 1]["aggregate_result"]["numerator"];
            den = data['PDC-057'][f][data['PDC-057'][f].length - 1]["aggregate_result"]["denominator"];

            s += num+",";
            s += ((num/den)*100)+",";

            num = data['PDC-058'][f][data['PDC-058'][f].length - 1]["aggregate_result"]["numerator"];
            den = data['PDC-058'][f][data['PDC-058'][f].length - 1]["aggregate_result"]["denominator"];

            s += num+",";
            s += ((num/den)*100)+",";

            s += "\n";

        }

        return s;

    }

    proc.generateCSVReport = generateCSVReport; 

    return that;


}

module.exports = {StatinsReport : StatinsReport}; 