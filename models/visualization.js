var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.Types.ObjectId,
    Mixed = Schema.Types.Mixed;

var schema = Schema({
    query: {
        type: ObjectId,
        ref: 'Query',
        index: {
            unique: true
        }
    },
    script: {
        type: String,
        trim: true
    }
});

// Define the model.
module.exports = mongoose.model('Visualization', schema);
