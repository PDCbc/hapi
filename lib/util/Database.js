/**
 * Created by sdiemert on 2015-06-29.
 */

var mongoose = require('mongoose');
var logger   = require('../logger.js').Logger();

var querySchema = {

    titie     : String,
    executions: [
        {
            _id             : mongoose.Schema.Types.ObjectId,
            time            : Number,
            notification    : String,
            aggregate_result: {
                denominator: Number,
                numerator  : Number
            }
        }
    ]
};

var resultSchema = {

    endpoint_id : mongoose.Schema.Types.ObjectId,
    execution_id: mongoose.Schema.Types.ObjectId,
    created_at  : String,
    status      : String,
    value       : {
        query_id: String
    }


};

var thirdNextSchema = {

    _id       : mongoose.Schema.Types.ObjectId,
    clinic    : String,
    date      : Number,
    clinicians: [
        {
            clinician: String,
            "3rdnext": Number
        }
    ]

};

var endpointSchema = {

    _id : mongoose.Schema.Types.ObjectId,
    name: String

};

function Database(url, next) {

    var conn = mongoose.connect(url).connection;

    resultSchema    = new mongoose.Schema(resultSchema);
    querySchema     = new mongoose.Schema(querySchema);
    endpointSchema  = new mongoose.Schema(endpointSchema);
    thirdNextSchema = new mongoose.Schema(thirdNextSchema);

    var result    = mongoose.model('results', resultSchema);
    var query     = mongoose.model('queries', querySchema);
    var endpoint  = mongoose.model('endpoints', endpointSchema);
    var thirdNext = mongoose.model('thirdnexts', thirdNextSchema);

    conn.once('open', function (callback) {

        logger.success('Connected to MongoDB');

        next({result: result, query: query, endpoint: endpoint, thirdNext: thirdNext}, conn);

    });

    conn.on('error', function (err) {

        console.log(err);
    });

    console.log('Attempting to connect to MongoDB.');

}

module.exports = {Database: Database};
