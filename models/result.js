var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.Types.ObjectId,
    Mixed = Schema.Types.Mixed;

var schema = Schema({
    endpoint_id: {
        // The endpoint of the query.
        type: ObjectId,
        // ref: 'Endpoint', // This isn't mapped for the adapter.
        required: true
    },
    query_id: {
        // The ID of the query this is related to.
        type: ObjectId,
        ref: 'Query',
        required: true
    },
    value: {
        // The value of the results. This will be a set of key/values.
        type: Object,
        required: false // Not present if the result isn't complete.
    },
    /**
     * State details.
     */
    created_at: {
        // The date the result was created. It starts in a 'queued' state.
        type: Date,
        required: true
    },
    updated_at: {
        // The date the result's status was updated to either 'complete' or 'canceled'
        type: String,
        required: true
    },
    status: {
        // The status of the endpoint result.
        type: String,
        enum: ['complete', 'canceled', 'queued'],
        required: true,
    },
});

// Define the model.
module.exports = mongoose.model('Result', schema);
