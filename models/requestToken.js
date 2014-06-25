var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.Types.ObjectId,
    Mixed = Schema.Types.Mixed;

var schema = Schema({
    identifier: {
        type: String,
        required: true,
        indexed: true
    },
    secret: {
        type: String,
        required: true
    },
    consumer: {
        type: ObjectId,
        ref: 'Consumer',
        required: true
    },
    callback: {
        type: String,
        required: true
    },
    approved: {
        type: Boolean,
        required: true,
        default: false
    },
    // Get added once approved.
    user: {
        type: ObjectId,
        ref: 'User',
        required: false
    },
    verifier: {
        type: String,
        required: false
    }
});

// Define the model.
module.exports = mongoose.model('RequestToken', schema);
