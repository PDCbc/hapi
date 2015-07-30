/**
 * Created by sdiemert on 2015-07-02.
 */

var util = require('util');

var ActivePatientExecution = function (data, time, endpoint, proc) {

    proc = proc || {};

    var that = {};

    that.data = JSON.parse(JSON.stringify(data));

    proc.time = new Date(time);

    proc.results = [];

    proc.endpoint = endpoint;


    for (var k in that.data) {

        proc.results.push(ActivePatientExecutionResult(k, that.data[k]));

    }

    var getCompressedData = function () {

        //toReturn.data is indexed by provider id for that endpoint.
        var toReturn = {time: getTime(), endpoint: proc.endpoint, data: {}};

        var d = getData();

        for (var i = 0; i < d.data.length; i++) {

            if (!toReturn.data[d.data[i].clinician]) {

                toReturn.data[d.data[i].clinician] = {denominator: 0, numerator: 0};

            }

            if (d.data[i].field === 'numerator') {

                toReturn.data[d.data[i].clinician].numerator += d.data[i].value;

            } else if (d.data[i].field === 'denominator') {

                toReturn.data[d.data[i].clinician].denominator += d.data[i].value;

            }

        }

        return toReturn;

    };

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

        var toReturn = {time: getTime(), endpoint: proc.endpoint, data: {numerator: 0, denominator: 0}};

        for (var i = 0; i < d.data.length; i++) {

            if (d.data[i].field === 'numerator') {

                toReturn.data.numerator += d.data[i].value;

            } else if (d.data[i].field === 'denominator') {

                toReturn.data.denominator += d.data[i].value;

            }

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

    that.getData           = getData;
    that.getReducedData    = getReducedData;
    that.getCompressedData = getCompressedData;
    that.getEndpoint       = getEndpoint;

    return that;
};

var ActivePatientExecutionResult = function (key, value, proc) {

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

        if (!matches || matches.length < 3) {

            return null;
        }

        return {

            field    : matches[1],
            clinician: matches[2]

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
    proc.regexString     = '^(numerator+|denominator+)_(.+)$';
    proc.dissectKey      = dissectKey;

    that.getData = getData;

    return that;
};

module.exports = {
    Execution      : ActivePatientExecution,
    ExecutionResult: ActivePatientExecutionResult
};
