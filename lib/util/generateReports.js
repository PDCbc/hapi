/**
 * Created by sdiemert on 2015-06-29.
 */
var util  = require('util');
var async = require('async');
var fs    = require('fs');

var environment = require('../environment.js');

var setupGroups = require('../groups.js').setupGroups[1];
  //not using async - should adjust this so that it does
console.log('setupGroups: ' + setupGroups);

process.env.QUERY = process.env.QUERY || 'PDC-001';
process.env.PROVIDER_LEVEL = process.env.PROVIDER_LEVEL === 'true' || false;
<<<<<<< HEAD
process.env.MONGO_URI = process.env.MONGO_URI || "mongodb://hubdb:27017";
=======
process.env.MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
>>>>>>> dev
process.env.HAPI_GROUPS = process.env.HAPI_GROUPS || ('../../groups.json');

environment(handleOutput);
setupGroups(handleOutput);

function handleOutput(err, results) {
  var e;
  if(err) {
    throw new Error('ERROR: '+ err);
  }

  if(results !== undefined && results !== null) {
    console.log('hanldeOutput results:\n' + util.inspect(results, false, null) );
  }
}

var doReport = function (data, connection) {

    var mr = null;
    var reportTitles = {'PDC-001':'Demographics', 'PDC-1740':'Encounters', 'PDC-1738':'Attachment'};
    var reportTitle = undefined;

    var validQueries = ['PDC-001', 'PDC-1740', 'PDC-1738', 'PDC-1741'];

    if(validQueries.indexOf[process.env.QUERY] < 0) {
      throw new Error('Query: \'' + process.eng.QUERY + '\' not supported by generateReport');
    }

    reportTitle = reportTitles[process.env.QUERY];

    //demographics and encounters (use Master report)
    if (process.env.QUERY === 'PDC-001' || process.env.QUERY === 'PDC-1740') {

        mr = require("./MasterReport.js").MasterReport(data);

    } else if (process.env.QUERY === 'PDC-1738') { // active patients (ratio type).

        mr = require("./AttachedActivePatientsReport.js").AttachedActivePatientReport(data);

    } else if (process.env.QUERY === 'PDC-1741') { // Third Next Appointment.

        mr = require("./ThirdNextReport.js").ThirdNextReport(data, parseInt(process.env.EXECUTION_DATE));

    }

    var s = mr.getReport(process.env.PROVIDER_LEVEL);

    var year = new Date().getFullYear();
    var month = new Date().getMonth() + 1;//take care of js nonesense

    fs.writeFileSync(reportTitle + 'Report' +  year + '-' + month + '.csv', s);

    console.log("Completed Report");


};

var executeNormalQuery = function (data, connection) {

    data.query.find(
        {title: process.env.QUERY},

        function (err, result) {

            if (result.length !== 1) {

                console.log('ERROR: Could not find exactly one query with title: ' + process.env.QUERY);
		connection.close();
                process.exit();

            }

            var exes = [];
            doReport(result[0].executions);
	    connection.close();
        }
    );
};

var getThirdNextData = function (data) {

    data.thirdNext.find(
        {},
        function (err, result) {

            if (err) {

                console.log(err);
                process.exit();

            }

            doReport(result);

        }
    );
};

var onConnect = function (data, connection) {

    if (process.env.QUERY === "PDC-1741") {

        getThirdNextData(data);

    } else {

        executeNormalQuery(data, connection);

    }

};

console.log("Starting");

console.log("QUERY=" + process.env.QUERY);
console.log("EXECUTION_DATE=" + process.env.EXECUTION_DATE);
console.log("PROVIDER_LEVEL=" + process.env.PROVIDER_LEVEL);
console.log("MONGO_URI=" + process.env.MONGO_URI);
require('./Database.js').Database(process.env.MONGO_URI + "/query_composer_development", onConnect);
