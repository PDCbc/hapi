'use strict';

var logger  = require('../logger'); 
var util    = require("util"); 
var Report  = require('./Report')


var PolypharmacyReport = function(shortName, name, dependancies, proc){

    //initialize protected variables.
    proc = proc || {}; 

    //Inherit methods from the parent object. Protected methods/variables
    //will be available via the proc object after this function is called.
    //the that variable will contain the public methods/variables from
    //Report object.
    //
    var that = Report.Report(shortName, name, dependancies, proc);

    return that;

}

module.exports = {PolypharmacyReport : PolypharmacyReport};