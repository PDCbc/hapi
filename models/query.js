var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.Types.ObjectId,
    Mixed = Schema.Types.Mixed;

var schema = Schema({
    /**
     * Things that are required by the adapter.
     */
    title: {
        // The title of the query. This should be unique amongst the database. For example "PDC-001"
        type: String,
        required: true,
        unique: true,
        indexed: true
    },
    description: {
        // A description of the query. It should be a sentence or two. For example "Measures fasting blood sugar in patients 65 or older."
        type: String,
        required: true
    },
    executions: {
        // The set of results for the query.
        type: [{
            type: ObjectId,
            ref: 'Result'
        }],
        default: []
    },
    /**
     * Things that are interesting to the adapter, but it doesn't require them.
     */
    map: {
        // The map function.
        type: String,
        required: false
    },
    filter: {
        // The filter function.
        type: String,
        required: false
    },
    reduce: {
        // The reduce function.
        type: String,
        required: false
    },
    user_id: {
        // The user who wrote the query.
        type: ObjectId,
        // ref: 'User', //
        required: false
    }
    // TODO: Any additional info?
});

// Define the model.
module.exports = mongoose.model('Query', schema);
