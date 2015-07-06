/**
 * Created by sdiemert on 2015-06-30.
 */

var util = require('util');

var Execution = function (data, time, endpoint, proc) {

    proc = proc || {};

    var that = {};

    that.data = JSON.parse(JSON.stringify(data));

    proc.time = new Date(time);
    that.time = proc.time;

    proc.results = [];

    proc.endpoint = endpoint;

    proc.supportedKeys    = require("../ResultManager/DemographicsResultManager").SUPPORTED_AGERANGES;
    proc.supportedGenders = require("../ResultManager/DemographicsResultManager").SUPPORTED_GENDERS;


    for (var k in that.data) {

        proc.results.push(ExecutionResult(k, that.data[k]));

    }

    var getData = function () {

        var toReturn = [];

        var tmp = null;
        for (var i = 0; i < proc.results.length; i++) {

            tmp = proc.results[i].getData();
            if (tmp) {

                toReturn.push(tmp);

            }

        }

        return {time: getTime(), endpoint: proc.endpoint, data: toReturn};

    };

    var getReducedData = function () {

        var d = getData();

        var toReturn = {time: getTime(), endpoint: proc.endpoint, data: {}};

        //generate an empty spot for every item.
        for (var j = 0; j < proc.supportedGenders.length; j++) {

            for (var i = 0; i < proc.supportedKeys.length; i++) {

                if (!toReturn.data[proc.supportedGenders[j]]) {

                    toReturn.data[proc.supportedGenders[j]] = {};

                }

                toReturn.data[proc.supportedGenders[j]][proc.supportedKeys[i]] = 0;

            }

        }

        for (i = 0; i < d.data.length; i++) {

            toReturn.data[d.data[i].gender][d.data[i].combinedAge] += d.data[i].value;

        }

        return toReturn;

    };

    var getDataByClinician = function () {


        //indexed by clinician ID.
        var toReturn = {};

        var d = getData();

        //loop through and generate keys, one per clinican
        for (var r = 0; r < d.data.length; r++) {

            if (!toReturn[d.data[r].clinician]) {

                toReturn[d.data[r].clinician] = {time: getTime(), endpoint: proc.endpoint, data: {}};

            }

        }

        toReturn = JSON.parse(JSON.stringify(toReturn));

        for (var c in toReturn) {
            //generate an empty spot for every item.
            for (var j = 0; j < proc.supportedGenders.length; j++) {

                for (var i = 0; i < proc.supportedKeys.length; i++) {

                    if (!toReturn[c].data[proc.supportedGenders[j]]) {

                        toReturn[c].data[proc.supportedGenders[j]] = {};

                    }

                    toReturn[c].data[proc.supportedGenders[j]][proc.supportedKeys[i]] = 0;

                }

            }

        }

        for (r = 0; r < d.data.length; r++) {

            toReturn[d.data[r].clinician].data[d.data[r].gender][d.data[r].combinedAge] += d.data[r].value;

        }

        return toReturn;

    };

    /**
     * Returns time in number of seconds from epoch.
     * @returns {number}
     */
    var getTime = function () {

        return Math.floor((proc.time.getTime()) / 1000);

    };

    var getEndpoint = function () {

        return proc.endpoint;

    };

    that.getData        = getData;
    that.getReducedData = getReducedData;
    that.getDataByClinician = getDataByClinician;
    that.getTime           = getTime;
    that.getEndpoint       = getEndpoint;

    return that;
};

var ExecutionResult = function (key, value, proc) {

    proc = proc || {};

    var that = {};

    that.key   = key;
    that.value = value;

    var dissectKey = function () {

        var re      = new RegExp(proc.regexString, 'gi');
        var matches = re.exec(that.key);
        return proc.objectFromSplit(matches);

    };

    var objectFromSplit = function (matches) {

        if (!matches || matches.length < 5) {

            return null;
        }

        return {

            gender     : matches[1],
            lowerAge   : parseInt(matches[2]),
            upperAge   : matches[3] === '+' ? null : parseInt(matches[3]),
            combinedAge: parseInt(matches[2]) + (matches[3] === '+' ? '+' : "-" + parseInt(matches[3])),
            clinician  : matches[4],
            original   : matches[0]

        };
    };

    var getData = function () {

        var tmp = proc.dissectKey();

        if (tmp) {
            tmp.value = that.value;
            return tmp;
        } else {
            return null;
        }


    };

    proc.objectFromSplit = objectFromSplit;
    proc.regexString     = '^([a-zA-z]+)_([0-9]{1,2})-?([0-9]{1,2}|\\+)_(.+)$';
    proc.dissectKey      = dissectKey;

    that.getData = getData;

    return that;
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
