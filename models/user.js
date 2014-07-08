var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.Types.ObjectId,
    Mixed = Schema.Types.Mixed,
    bcrypt = require('bcrypt'),
    SALT_WORK_FACTOR = 10;

// Declare a User Schema.
var schema = Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    indexed: true
  },
  password: {
    type: String,
    required: true
  }
  // TODO: Add more here.
});

// Hide the password.
schema.pre('save', function(next) {
  var user = this;
  if(!user.isModified('password')) return next();
  bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
    if(err) return next(err);
    bcrypt.hash(user.password, salt, function(err, hash) {
      if(err) return next(err);
      user.password = hash;
      next();
    });
  });
});

// Verifies the password is correct.
schema.methods.comparePassword = function(candidatePassword, callback) {
  bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
    if(err) { return callback(err); }
    callback(null, isMatch);
  });
};

// Define the model.
module.exports = mongoose.model('User', schema);
