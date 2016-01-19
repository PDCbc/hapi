/**
 * Created by sdiemert on 2015-07-02 *
 *
 * Generates a report that shows the AttachedActivePatients.
 *
 * This report should only be used to generate master reports
 * upon request from PDC administrators. It is not meant to be
 * used by the normal HAPI webservice.
 */


var util      = require("util");
var logger    = require('../logger.js').Logger("AttachedActivePatientsReport", 1);
var clone = require("clone");
var inGroup = require('../groups.js').inGroup;
var Execution = require('./ActivePatientExecution.js').Execution;

//var MasterReport = require('./MasterReport.js').MasterReport;
var AttachedActivePatientReport = function (data, dayOfMonth, proc) {

    proc = proc || {};

    var that = {};

    that.raw_data = data;

    that.dayOfMonth = dayOfMonth || parseInt(process.env.EXECUTION_DATE) || 27;

    if(process.env.GROUP === undefined) {
      throw new Error('No group specified');
    }

    var INDIVIDUAL = 0;
    var GROUP = 1;
    var NETWORK = 2;

    var cohortDictionary = {0:'INDIVIDUAL', 1:'GROUP', 2:'NETWORK'};

    var filterByExecutionDate = function(rawDatum) {
      tmpDate = new Date(rawDatum.time*1000);
      return tmpDate.getDate() === that.dayOfMonth;
    };

    var clusterByPhysicianAndMapToModel = function(rawDatum) {

      var activePatientExecution = {};
      var date = new Date(rawDatum.time*1000);

      var aggregate_result = JSON.parse(JSON.stringify(rawDatum.aggregate_result));//clear up js funniness

      var keys = Object.keys(aggregate_result);

      keys.forEach( function(key) {
        var keyComponents = key.split('_');

        if(keyComponents.length === 2) {
          var pid = keyComponents[1];

          if(activePatientExecution[pid]===undefined) {
            activePatientExecution[pid] = {date:date, pid:pid};
          }

          if(keyComponents[0] === 'denominator') {
            activePatientExecution[pid].denominator = aggregate_result[key];
          } else if (keyComponents[0] === 'numerator') {
            activePatientExecution[pid].numerator = aggregate_result[key];
          }
        }//otherwise ignore it
      });

      return activePatientExecution;
    };

    var sortExecutionsByPhysicianThenDate = function (a, b) {
      if(a.pid < b.pid)
      {
        return -1;
      } else if(a.pid>b.pid) {
        return 1;
      } else {
        if(a.date<b.date) {
          return +1;
        }
        else if(a.date>b.date) {
          return -1;
        }
        else {
          console.log('###A###');
          console.log(a);
          console.log('###B###');
          console.log(b);
          throw new Error('two executions for same physician on same date');
        }
      }
    };

    var filterByGroup = function(x) {
      return inGroup(x.pid, process.env.GROUP);
    };

    var clusterAttachdActivePatientsExecutionsByDate = function (previousValue, currentValue, currentIndex, array) {

      var date = currentValue.date;

      if(previousValue[date]===undefined) {
        previousValue[date] = [];
      }

      previousValue[date].push(currentValue);

      return previousValue;
    };

    var removeKeys = function(keyedObject) {
      var keys = Object.keys(keyedObject);

      return keys.map( function(key){
        return keyedObject[key];
      });
    };

    var reduceForAggregates = function(previousValue, currentValue, currentIndex, array, label) {

      currentValue.forEach( function(x) {
        var date = x.date;

        if(previousValue[date] === undefined) {
          previousValue[date] = {pid:label, numerator:0, denominator:0, date:x.date};
        }

        previousValue[date].numerator += x.numerator;
        previousValue[date].denominator += x.denominator;
      });

      return previousValue;
    };

    var header = "Entity, ";
    var ontoaggs = false;
    var firstPhysician = true;

    var output = function(previousValue, currentValue, currentIndex, array, headerFlag) {
      if(currentValue.pid !== lastPid) {
        previousValue += '\n' + currentValue.pid;

        if(lastPid !== undefined) {
          firstPhysician = false;
        }
      }

      if(headerFlag && firstPhysician) {
        header += currentValue.date.toDateString() + ',' + 'Active Patients,' + 'Change in Active Patients,' + '% Change in Active Patients,';
      }

      previousValue += ',\'-\',' +
        currentValue.numerator + ',' +
        ((lastNumerator !== undefined) ? currentValue.numerator - lastNumerator : 'NA')  + ',' +
        ((lastNumerator !== undefined && lastDenominator !== undefined) ? ((currentValue.numerator/currentValue.denominator) - (lastNumerator/lastDenominator)) : 'NA');
      lastPid = currentValue.pid
      lastNumerator = currentValue.numerator;
      lastDenominator = currentValue.denominator;

      return previousValue;
    };

    var lastPid = undefined;
    var lastNumerator = undefined;
    var lastDenominator = undefined;

    var getReport = function (withProviders) {

        that.executions = [];

        that.executions[NETWORK] = that.raw_data.filter(filterByExecutionDate);
        that.executions[NETWORK] = that.executions[NETWORK].map(clusterByPhysicianAndMapToModel);
        that.executions[NETWORK] = that.executions[NETWORK].reduce(
          function (previousValue, currentValue, currentIndex, array) {
            var entries = removeKeys(currentValue);
            return previousValue.concat(entries);
          }, []
        );

        that.executions[NETWORK] = that.executions[NETWORK].sort(sortExecutionsByPhysicianThenDate);
        that.executions[GROUP] = clone(that.executions[NETWORK]);
        that.executions[GROUP] = that.executions[GROUP].filter(filterByGroup);
        that.executions[INDIVIDUAL] = clone(that.executions[GROUP]);

        that.executions[GROUP] = that.executions[GROUP].reduce(clusterAttachdActivePatientsExecutionsByDate, {});
        that.executions[NETWORK] = that.executions[NETWORK].reduce(clusterAttachdActivePatientsExecutionsByDate, {});


        that.executions[GROUP] = removeKeys(that.executions[GROUP]);
        that.executions[NETWORK] = removeKeys(that.executions[NETWORK]);

        that.executions[GROUP] = that.executions[GROUP].reduce(function (previousValue, currentValue, currentIndex, array) {
            return reduceForAggregates(previousValue, currentValue, currentIndex, array, cohortDictionary[GROUP]);
          }, {}
        );

        that.executions[NETWORK] = that.executions[NETWORK].reduce(function (previousValue, currentValue, currentIndex, array) {
            return reduceForAggregates(previousValue, currentValue, currentIndex, array, cohortDictionary[NETWORK]);
          }, {}
        );

        that.executions[GROUP] = removeKeys(that.executions[GROUP]);
        that.executions[NETWORK] = removeKeys(that.executions[NETWORK]);

        var body = that.executions[INDIVIDUAL].reduce(function(previousValue, currentValue, currentIndex, array) {
            return output(previousValue, currentValue, currentIndex, array, true);
         }, ''
        );

        ontoaggs = true;
        lastPid = undefined;
        lastNumerator = undefined;
        lastDenominator = undefined;

        body = that.executions[GROUP].reduce(function(previousValue, currentValue, currentIndex, array) {
            return output(previousValue, currentValue, currentIndex, array, false);
         }, body);


        lastPid = undefined;
        lastNumerator = undefined;
        lastDenominator = undefined;

        body = that.executions[NETWORK].reduce(function(previousValue, currentValue, currentIndex, array) {
             return output(previousValue, currentValue, currentIndex, array, false);
          }, body);

        return header + body;
    };

    that.getReport = getReport;

    return that;
};

module.exports = {AttachedActivePatientReport: AttachedActivePatientReport};
