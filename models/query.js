var mongoose = require('mongoose'),
    _ = require('lodash'),
    Result = require('./result'),
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
/**** TODO: 3-001 Fieran needs to change here because they are not ObjectIDs. ****/
    executions: [
      {
        time: Number,
        notification:String,
        aggregate_result:{
          denominator:Number,
          numerator:Number
        }
      }
    ],

/***** TODO: 3-001 End of things Fieran needs to change. ****/
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
        ref: 'User',
        required: false
    }
    // TODO: Any additional info?
});

/**** TODO: 3-002 Fieran needs to change to add the method. ****/

/***** TODO: 3-002 End of things Fieran needs to change. ****/

// Define the model.
module.exports = mongoose.model('Query', schema);
