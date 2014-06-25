var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.Types.ObjectId,
    Mixed = Schema.Types.Mixed;

var schema = Schema({
    identifer: {
        type: String,
        required: true,
        indexed: true
    },
    secret: {
        type: String,
        required: true
    },
    user: {
        type: ObjectId,
        ref: 'User',
        required: true
    }
    // TODO: More.
});

// Define the model.
module.exports = mongoose.model('AccessToken', schema);
