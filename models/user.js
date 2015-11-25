var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.Types.ObjectId,
    Mixed = Schema.Types.Mixed,
    bcrypt = require('bcryptjs'),
    fs = require('fs'),
    _ = require('lodash'),
    SALT_WORK_FACTOR = 10;

// Declare a User Schema.
var schema = Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        indexed: true
    },
    encrypted_password: {
        type: String,
        required: true
    },
    admin: {
        type: Boolean,
        required: true
    }
    // TODO: Add more here.
});


// Hide the password.
schema.pre('save', function passwordHash(next) {
    var user = this;
    if (!user.isModified('encrypted_password')) {
        return next();
    } else {
        bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
            if(err) return next(err);
            bcrypt.hash(user.encrypted_password, salt, function(err, hash) {
                if(err) {
                    return next(err);
                } else {
                    user.encrypted_password = hash;
                    next();
                }
            });
        });
    }
});

// Verifies the password is correct.
schema.methods.comparePassword = function comparePassword(candidatePassword, callback) {
    bcrypt.compare(candidatePassword, this.encrypted_password, function(err, isMatch) {
        if (err) { return callback(err); }
        else { callback(null, isMatch); }
    });
};

/**
 * Gets the roles for the user.
 * @param  {Function} callback The callback, signature `(err, roles)`
 */
schema.methods.roles = function roles(next) {
    var user = this;
    // TODO: Cache or otherwise store this result. Right now it's rather inefficient.
    fs.readFile(process.env.ROLES, { encoding: 'UTF-8'}, function parse(err, data) {
        if (!err && data) {
            // Get the first value matching the user's name.
            var line = _.find(data.split('\n'), function select(line) {
                return line.slice(0, user.username.length) === user.username;
            });
            var roles;
            if (line !== null) {
                roles = line.split(':')[1].split(',');
            } else {
                roles = [];
            }
            next(null, roles);
        } else {
            next(new Error("Couldn't read roles file."), null);
        }
    });
};

// Define the model.
module.exports = mongoose.model('User', schema);
