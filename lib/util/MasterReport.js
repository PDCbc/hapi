/**
 *
 * Created by sdiemert on 2015-07-06.
 */

var util = require("util");
var clone = require("clone");
var pdcUtil = require("./PDCUtil").PDCUtil;
var Execution = require("./Execution.js").Execution;

var setUpGroups = require('../groups.js').setUpGroups;
var inGroup = require('../groups.js').inGroup;

var timeKey;
var physicianKey;

var MasterReport = function (executions, dayOfMonth, proc) {

  var that = {};
  proc = proc || {};
  proc.dayOfMonth = dayOfMonth || process.env.EXECUTION_DATE;

  if(process.env.GROUP===undefined || process.env.GROUP===null) {
    throw new Error('GROUP environment variable not set');
  }

  for (var i = 0; i < executions.length; i++) {//structure, then into the proc
  	Execution(executions[i].aggregate_result, executions[i].time, proc);
  }

  var filterResultsForExecutionDate = function (e) {//right day filter

    var tmp = new Date(e.time);

    if (tmp.getDate() === proc.dayOfMonth) {
    	return false;
    }

    return true;
  };

  /**
   * Takes an array of executions and returns the subreport string.
   * @param exes
   */
  var generateSubReport = function (title, exes) {

      var s = "\n\n" + title + "\n";

      s += "Age Range,Gender,";

      var tmpDate = null;
  /*
      for (var e = 0; e < exes.length; e++) {

          tmpDate = new Date(exes[e].time * 1000);
          s += tmpDate.getFullYear() + "-" + (tmpDate.getMonth() + 1) + "-" + tmpDate.getDate() + ",";

      }

      s += "\n";

      for (var a in exes[0].data['male']) {

          s += a;

          for (var g in exes[0].data) {

              s += ",";
              s += g + ",";

              for (e = 0; e < exes.length; e++) {

                  s += exes[e].data[g][a].toFixed(2) + ",";

              }

              s += "\n";

          }

      }
  */
      return s;


  };

  var getTotals = function (byClinic) {
    //need to combine all executions into a list of executions.

    var totals = [];

    byClinic = JSON.parse(JSON.stringify(byClinic));

    for (var c in byClinic) {

      for (var e = 0; e < byClinic[c].self.length; e++) {

        if (!totals[e]) {
            totals[e]          = {time: null, data: {}, endpoint: null};
            totals[e].time     = byClinic[c].self[e].time;
            totals[e].endpoint = byClinic[c].self[e].endpoint;
        }

        for (var g in byClinic[c].self[e].data) {

          if (!totals[e].data[g]) {
              totals[e].data[g] = {};
          }

          for (var a in byClinic[c].self[e].data[g]) {
            if (!totals[e].data[g][a]) {
                totals[e].data[g][a] = 0;
            }

            totals[e].data[g][a] += byClinic[c].self[e].data[g][a];
          }
        }
      }
    }

    return generateSubReport("Network Total", totals);

  };


  var INDIVIDUAL = 0;
  var GROUP = 1;
  var NETWORK = 2;

  var cohortDictionary = {0:'INDIVIDUAL', 1:'GROUP', 2:'NETWORK'};

  var header = 'entity, gender, ageRange, ';
  var physicians = [];

  var getReport = function (withProviders) {

  	proc.results = proc.results.filter(filterResultsForExecutionDate);//filter wrong day executions
  	proc.results = proc.results.sort(sortByTime);//sort by time

  	//structure results for individuals then group then network
  	var results = proc.results;

  	proc.results = [];
  	proc.results[INDIVIDUAL] = clusterByIndividual(results);
  	proc.results[NETWORK] = clone(proc.results[INDIVIDUAL]);//deep clone just to be safe --- include all individuals in the network
  	proc.results[INDIVIDUAL] = proc.results[INDIVIDUAL].filter(filterIndividualClusteredResultsForGroup);//filter out physicians which are not part of this group
  	proc.results[GROUP] = clone(proc.results[INDIVIDUAL]);//deep clone just to be safe

  	//handle group
  	proc.results[GROUP] = proc.results[GROUP].reduce(reduceRecords, {});//aggregate physicians //one group of physicians
  	proc.results[GROUP] = mapAggregatesForTimeClustering(proc.results[GROUP]);
  	proc.results[GROUP] = [proc.results[GROUP]].reduce(clusterByTimeInterval, []);//cluster by time interval
  	proc.results[GROUP] = proc.results[GROUP].map(removeTimeKeys)[0];//clean keys - restructure now that we've clustered by time interval

  	///handle network
  	proc.results[NETWORK] = proc.results[NETWORK].reduce(reduceRecords, {});//aggregate physicians //one group of physicians
  	proc.results[NETWORK] = mapAggregatesForTimeClustering(proc.results[NETWORK]);
  	proc.results[NETWORK] = [proc.results[NETWORK]].reduce(clusterByTimeInterval, []);//cluster by time interval
  	proc.results[NETWORK] = proc.results[NETWORK].map(removeTimeKeys)[0];//clean keys - restructure now that we've clustered by time interval

  	var csv = createCSV();

  	return csv;
  };

  that.getReport = getReport;

  return that;


  function filterIndividualClusteredResultsForGroup(physician) {
    var result = physician[0][0];//first result from first time interval

    var keys = Object.keys(result);

    if(keys.length != 1) {
      throw new Error('record with ' + keys.length + ' found while filtering physicians');
    }

    var parsedKey = JSON.parse(keys[0]);

    var pid = parsedKey.pid;

    var physInGroup = inGroup(pid, process.env.GROUP);

    return inGroup;
  }

  function mapAggregatesForTimeClustering(aggregate) {
    keys = Object.keys(aggregate);

    if(keys.length%40!==0) {
      throw new Error('mapAggregatesForTimeClustering: weird aggregate:\n' + util.inspect(aggregate, false, null));
    }

    var result = [];

    for(var key in keys) {
      var object = {};
      object[keys[key]] = aggregate[keys[key]];
      result.push(object);
    }

    return result;
  }

  function createCSV() {
  	var individual_results = proc.results[INDIVIDUAL];
  	var group_results = proc.results[GROUP];
  	var network_results = proc.results[NETWORK];

  	var individualCSVSection = individual_results.reduce(
  	  function (previousAtPhysician, physician, physicianIndex, physicianArray) {
  	    return physician.reverse().reduce(//hack - the sort is somehow reversed -- bug hotspot
  	      function (previousAtTimeInterval, timeInterval, timeIntervalIndex, timeIntervalArray) {
            return reduceTimeIntervalsPhysician(previousAtTimeInterval, timeInterval, timeIntervalIndex, timeIntervalArray, physicianIndex);
  	      }, previousAtPhysician);
  	  }, '');

  	var groupCSVSection = group_results.reverse().reduce(reduceTimeIntervalsGroup, []);//hack - the sort is somehow reversed -- bug hotspot

  	var networkCSVSection = network_results.reverse().reduce(reduceTimeIntervalsNetwork, []);//hack - the sort is somehow reversed -- bug hotspot

  	return header += '\n' + individualCSVSection + groupCSVSection + networkCSVSection;
  }

  function reduceTimeIntervalsPhysician(previousAtTimeInterval, timeInterval, timeIntervalIndex, timeIntervalArray, physicianIndex) {
    var qualifier = INDIVIDUAL;
    return reduceTimeIntervals(previousAtTimeInterval, timeInterval, timeIntervalIndex, timeIntervalArray, qualifier, physicianIndex);
  }

  function reduceTimeIntervalsGroup(previousAtTimeInterval, timeInterval, timeIntervalIndex, timeIntervalArray) {
    var qualifier = GROUP;
    return reduceTimeIntervals(previousAtTimeInterval, timeInterval, timeIntervalIndex, timeIntervalArray, qualifier);
  }

  function reduceTimeIntervalsNetwork(previousAtTimeInterval, timeInterval, timeIntervalIndex, timeIntervalArray) {
    var qualifier = NETWORK;
    return reduceTimeIntervals(previousAtTimeInterval, timeInterval, timeIntervalIndex, timeIntervalArray, qualifier);
  }

  function reduceTimeIntervals(previousAtTimeInterval, timeInterval, timeIntervalIndex, timeIntervalArray, qualifier, physicianIndex) {

  	var keys = Object.keys(timeInterval[0]);

  	if(keys.length !== 1) {
  	  throw new Error('building csv - encountered segment object with ' + keys.length + ' keys');
  	}

  	var key = keys[0];

  	var parsedKey = JSON.parse(key);

  	var ids = {};

  	if(timeIntervalIndex===0) {
  	  physicians.push(parsedKey.pid);
  	}

  	ids[INDIVIDUAL] = 'physician ' + physicians.indexOf(parsedKey.pid);
  	ids[GROUP] = cohortDictionary[GROUP];
  	ids[NETWORK] = cohortDictionary[NETWORK];

  	//row label
  	if(timeIntervalIndex===0) {
  	  previousAtTimeInterval += ids[qualifier];
  	}

  	if(qualifier === INDIVIDUAL && physicianIndex === 0) {
  	  //column label
  	  var d = new Date(parsedKey.time * 1000);
  	  var date = d.toDateString();
  	  header += date + ',';
  	}

  	//**TODO --- assuming that the physician has an execution for every day --- GROUP and NETWORK match
  	//**this isn't necessarily true, but will be for our initial execution --- should be true if a retro
  	//**is run for every physician --- highly likely to cause some kind of subtle bug --- think about this if
  	//**you bump into this message

    return timeInterval.reduce(
  	  function(previousAtGenderAgeRange, genderAgeRange, genderAgeRangeIndex, genderAgeRangeArray) {
  	    return reduceTimeInterval(previousAtGenderAgeRange, genderAgeRange, genderAgeRangeIndex, genderAgeRangeArray, timeIntervalIndex, physicianIndex);
  	  }, previousAtTimeInterval);
  }

  function reduceTimeInterval(previousAtGenderAgeRange, genderAgeRange, genderAgeRangeIndex, genderAgeRangeArray, timeIntervalIndex, physicianIndex) {
	  physicianIndex = (physicianIndex===undefined) ? 0 : physicianIndex;

	  var keys = Object.keys(genderAgeRange);

	  if(keys.length!==1) {
	    throw new Error('creating csv - inspecting genderAgeRange - found element with ' + keys.length + ' keys');
	  }

	  var key = keys[0];

	  var parsedKey = JSON.parse(key);

	  if(timeIntervalIndex===0) {
	    previousAtGenderAgeRange += ',' + parsedKey.gender + ',\'' + parsedKey.ageRange + '\',' + genderAgeRange[key] + '\n';
	  }
	  else {
	    var index = nthIndex(previousAtGenderAgeRange, '\n', (40*physicianIndex + genderAgeRangeIndex + 1));//need to insert before \n //header not added yet
	    previousAtGenderAgeRange = previousAtGenderAgeRange.slice(0, index) + ',' + genderAgeRange[key] + previousAtGenderAgeRange.slice(index);
	  }

	  return previousAtGenderAgeRange;
	}

  function nthIndex(str, pat, n) {
    var L= str.length, i= -1;
    while(n-- && i++<L) {
        i= str.indexOf(pat, i);
    }
    return i;
  }

  function reduceRecords(previousValue, physician, currentIndex, array ) {
  	physician.forEach(
  	  function(timeInterval) {
  	    timeInterval.forEach(
  	      function(demographicSegment) {
        		var keys = Object.keys(demographicSegment);

        		if(keys.length !== 1) {
        		  throw new Error('Error: reduceRecords: demographicSegment with ' + keys.length + ' keys');
        		}

        		var key = keys[0];
        		var parsedKey = JSON.parse(keys);

        		var segment = {'gender':parsedKey.gender, 'ageRange':parsedKey.ageRange, 'time':parsedKey.time};

        		var segmentString = JSON.stringify(segment);

        		if(!previousValue[segmentString]) {
        		  previousValue[segmentString] = demographicSegment[key];
        		}
        		else {
        		  previousValue[segmentString] += demographicSegment[key];
        		}
  	      });
  	  });

	  return previousValue;
  }

  function clusterByIndividual(mapCurrentValue) {

    mapCurrentValue = mapCurrentValue.reduce(function(previousValue, currentValue, currentIndex, array) {
    						return clusterByField(previousValue, currentValue, currentIndex, array, 'pid');
    					}, {});//cluster by pid

    var physicianKey;

    mapCurrentValue = Object.keys(mapCurrentValue).map(
    	function (key) {
    		physicianKey = key;
    		return mapCurrentValue[key];
    	});//remove physician keys transorming the object back to an array

    mapCurrentValue = mapCurrentValue.reduce(clusterByTimeInterval, []);//cluster by time
    mapCurrentValue = mapCurrentValue.map(removeTimeKeys);
    mapCurrentValue = mapCurrentValue.map(
      function(currentPhysician, physicianIndex, physicianArray) {
      	return currentPhysician.map(
      		function(currentTimeInterval, timeIntervalIndex, timeIntervalArray) {
      		  return currentTimeInterval.sort(sortByAgeRangeAndGender);
      		});
      });

    return mapCurrentValue;
  }

  function clusterByTimeInterval(previousValue, currentValue, currentIndex, array) {
	   previousValue.push(currentValue.reduce(clusterByTime, {}));
     return previousValue;
   }

  function clusterByTime(previousValue, currentValue, currentIndex, array) {
    return clusterByField(previousValue, currentValue, currentIndex, array, 'time');
  }

  function removeTimeKeys(entity) {//remove time keys transorming the object back to an array
    return Object.keys(entity).map(
      function (key) {
          timeKey = key;
          return entity[key];
        });
  }

  function clusterByField(clusterByFieldPreviousValue, clusterByFieldCurrentValue, clusterByFieldCurrentIndex, clusterByFieldArray, field) {

  	var keys = Object.keys(clusterByFieldCurrentValue);

  	if(keys.length != 1) {
  	  throw new Error('ERROR: clusterBy ' + field + ' - entry with ' + keys.length + ' keys');
  	}

  	var parsedKey = JSON.parse(keys[0]);

  	if(clusterByFieldPreviousValue[parsedKey[field]]===undefined) {
  		clusterByFieldPreviousValue[parsedKey[field]]=[];
  	}

  	clusterByFieldPreviousValue[parsedKey[field]].push(clusterByFieldCurrentValue);

    return clusterByFieldPreviousValue;
  }

  function sortByAgeRangeAndGender(resulta, resultb) {

  	var aKeys = Object.keys(resulta);
  	var bKeys = Object.keys(resultb);

  	if(aKeys.length !== 1 || bKeys.length !== 1) {
  	  throw new Error('comparable "a" with not exactly one key');
  	}

  	var aKey = JSON.parse(aKeys[0]);
  	var bKey = JSON.parse(bKeys[0]);

  	var genderOrder = {'male':0, 'female':1, 'undifferentiated':2, 'undefined':3};

  	var aGenderOrder = genderOrder[aKey.gender];
  	var bGenderOrder = genderOrder[bKey.gender];


  	if(aGenderOrder === undefined) {
  	  throw new Error('specified gender does not exist: ' + aKey.gender );
  	}

  	if(bGenderOrder === undefined) {
  	  throw new Error('specified gender does not exist: ' + bKey.gender );
  	}

  	//sort by gender
  	if(aGenderOrder < bGenderOrder) {
  	  return -1;
  	}
  	else if(aGenderOrder>bGenderOrder) {
  	  return 1;
  	}
  	else if(aGenderOrder === bGenderOrder) {//then sort by ageRange
  	  aKeyAgeRange = aKey.ageRange;
  	  bKeyAgeRange = bKey.ageRange;

  	  if(typeof aKeyAgeRange !== 'string') {
  	    throw new Error('ageRange attribute not a string: ' + aKeyAgeRange);
  	  }

  	  if(typeof bKeyAgeRange !== 'string') {
  	    throw new Error('ageRange attribute not a string: ' + bKeyAgeRange);
  	  }

  	  if(aKeyAgeRange < bKeyAgeRange) {
  	    return -1;
  	  }
  	  else if(aKeyAgeRange > bKeyAgeRange) {
  	    return 1;
  	  }
  	  else if(aKeyAgeRange === bKeyAgeRange) {
  	    throw new Error('duplicate age range');
  	  }
  	  else {
  	    throw new Error('non comparable age ranges?');
  	  }
  	}
  	else {
  	  throw new Error('sort found values that are uncomaprable?');
    }
  }

  function sortByTime(a, b) {
    if (a.time > b.time) {
    	return -1;
    } else if (a.time < b.time) {
    	return 1;
    } else {
    	return 0;
    }
  }
}

module.exports = {MasterReport: MasterReport};
