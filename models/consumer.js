var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.Types.ObjectId,
    Mixed = Schema.Types.Mixed;

var schema = Schema({
  name: {
    type: String,
    required: true,
    indexed: true
  },
  key: {
    type: String,
    required: true,
    indexed: true
  },
  secret: {
    type: String,
    required: true
  }
  // TODO: More.
});

// Define the model.
module.exports = mongoose.model('Consumer', schema);
