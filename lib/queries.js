/**
 * Created by sdiemert on 2015-06-26.
 *
 * Contains queries and their types (ratio, demographics, medclass etc...)
 */

var RATIO        = 'ratio';
var DEMOGRAPHICS = 'demographics';
var MEDCLASS     = 'medclass';

var queries = {

    'PDC-001': DEMOGRAPHICS,

    'PDC-055': MEDCLASS,

    'PDC-053' : RATIO,
    'PDC-054' : RATIO,
    'PDC-057' : RATIO,
    'PDC-058' : RATIO,
    'PDC-1738': RATIO,
    'PDC-1178': RATIO

};

/**
 * Determines the type of query.
 *
 * @param title {String} - the title of the query from the database.
 *
 * @return {String} - One of "ratio", "medclass", "demographics" which are accessible via the
 *      module.exports.TYPE field (e.g. module.exports.RATIO === 'ratio'). Returns null if a type
 *      cannot be found.
 */
var getQueryType = function (title) {

    if (!title) {

        return null;

    }

    if (queries.hasOwnProperty(title)) {

        return queries[title];

    } else {

        return null;

    }

};

var setQueries = function (data) {

    queries = data;

};

module.exports = {

    RATIO       : RATIO,
    DEMOGRAPHICS: DEMOGRAPHICS,
    MEDCLASS    : MEDCLASS,
    queries     : queries,
    getQueryType: getQueryType,
    setQueries  : setQueries

};
