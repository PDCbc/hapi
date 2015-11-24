/**
 * Created by sdiemert on 2015-06-30.
 */

var util = require('util');
var pdcUtil = require('./PDCUtil').PDCUtil;

var Execution = function (aggregate_result, time, proc) {

    proc = proc || {};
    proc.results = proc.results || [];
    
    var aggregate_result = JSON.parse(JSON.stringify(aggregate_result));

    proc.supportedKeys    = require("../resultManager/DemographicsResultManager").SUPPORTED_AGERANGES;
    proc.supportedGenders = require("../resultManager/DemographicsResultManager").SUPPORTED_GENDERS;

    for (var key in aggregate_result) {

	if(aggregate_result.hasOwnProperty(key))
	{
		var result = new ExecutionResult(key, time, aggregate_result[key], proc);
		if(result !== null) {
		  proc.results.push(result);
		}
	}
    }
};

var ExecutionResult = function (key, time, value, proc) {

    var elements = ['gender', 'ageRange', 'pid'];
    var parsedKey = pdcUtil.parse(key, elements);
    
    if(proc.supportedGenders.indexOf(parsedKey.gender) === -1) {
      return null;
    }
    
    if(proc.supportedKeys.indexOf(parsedKey.ageRange) === -1) {
      return null;
    }
    
    parsedKey.time = time;

    var executionResult = {};
    executionResult[JSON.stringify(parsedKey)] = value;
    return executionResult;
};

var DemographicsExecutionResult = function (key, value, proc) {

    proc = proc || {};

    var that = ExecutionResult(key, value, proc);

    proc.regexString = '^([a-zA-z]+)_([0-9]{1,2})-?([0-9]{1,2}|\\+)_(.+)$';

    return that;


};

module.exports = {
    Execution                  : Execution,
    ExecutionResult            : ExecutionResult,
    DemographicsExecutionResult: DemographicsExecutionResult
};
