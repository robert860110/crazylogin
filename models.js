var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    bcrypt = require('bcrypt'),
    SALT_WORK_FACTOR = 10;

// Connect to MongoDB
var connStr = 'mongodb://localhost/crazylogin';
mongoose.connect(connStr, function(err) {
    if (err) throw err;
    console.log('Successfully connected to MongoDB');
});

/////////////////////////////
// Define the schemas
/////////////////////////////

var db = {};

// create a Consent schema
var consentSchema = new Schema({
    user: { type: Schema.ObjectId, ref: 'User' },
    redirect_uris: { type: Array, required: true },
    credentialsFlow: { type: Boolean, default: false }
}, {
    timestamps: true
});

// create a Passcode schema
var passcodeSchema = new Schema({
    phone_number: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true, trim: true },
    isUsed: { type: Boolean, default: false }
}, {
    timestamps: true
});

passcodeSchema.pre('save', function(next) {
    var passcode = this;

    // only hash the password if it has been modified (or is new)
    if (!passcode.isModified('password')) return next();

    // generate a salt
    bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
        if (err) return next(err);

        // hash the password using our new salt
        bcrypt.hash(passcode.password, salt, function(err, hash) {
            if (err) return next(err);

            // override the cleartext password with the hashed one
            passcode.password = hash;
            next();
        });
    });
});

passcodeSchema.methods.comparePassword = function(candidatePassword, cb) {
    bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
        if (err) return cb(err);
        cb(null, isMatch);
    });
};

// create a User schema
var userSchema = new Schema({
    name: String,
    given_name: String,
    middle_name: String,
    family_name: String,
    profile: String,
    email: { type: String, required: true, unique: true, trim: true },
    phone_number: { type: String, required: true, unique: true },
    gender: { type: String, enum: ['M', 'F'] },
    birthday: Date,
    password: String,
    address: {
        addressline1: String,
        addressline2: String,
        city: String,
        state: String,
        country: String,
        zipCode: String
    }
}, {
    timestamps: true
});

// create a Client schema
var clientSchema = new Schema({
    client_id: { type: String, required: true, unique: true },
    client_secret: { type: String, required: true, unique: true },
    name: String,
    user: { type: Schema.ObjectId, ref: 'User' },
    redirect_uris: { type: Array, required: true },
    credentialsFlow: { type: Boolean, default: false }
}, {
    timestamps: true
});

// create a Auth schema
var authSchema = new Schema({
    client: { type: Schema.ObjectId, ref: 'Client' },
    scope: { type: String, required: true, unique: true },
    user: { type: Schema.ObjectId, ref: 'User' },
    sub: { type: String, required: true },
    code: { type: String, required: true },
    redirectUri: { type: String, required: true },
    responseType: { type: String, required: true },
    status: { type: String, required: true }
}, {
    timestamps: true
});

// create a Access token schema
var accessSchema = new Schema({
    token: { type: String, required: true },
    type: { type: String, required: true },
    idToken: String,
    expiresIn: Number,
    scope: { type: String, required: true },
    client: { type: Schema.ObjectId, ref: 'Client' },
    user: { type: Schema.ObjectId, ref: 'User' },
    auth: { type: Schema.ObjectId, ref: 'Auth' }
}, {
    timestamps: true
});

// create a Refresh token schema
var refreshSchema = new Schema({
    token: { type: String, required: true },
    scope: { type: String, required: true },
    auth: { type: Schema.ObjectId, ref: 'Auth' },
    status: { type: String, required: true }
}, {
    timestamps: true
});

// create a Client schema
var clientSchema = new Schema({
    client_id: { type: String, required: true, unique: true },
    client_secret: { type: String, required: true, unique: true },
    name: String,
    user: { type: Schema.ObjectId, ref: 'User' },
    redirect_uris: { type: Array, required: true },
    credentialsFlow: { type: Boolean, default: false }
}, {
    timestamps: true
});


var Consent = mongoose.model('Consent', consentSchema);
var Passcode = mongoose.model('Passcode', passcodeSchema);
var User = mongoose.model('User', userSchema);
var Client = mongoose.model('Client', clientSchema);
var Auth = mongoose.model('Auth', authSchema);
var Access = mongoose.model('Access', accessSchema);
var Refresh = mongoose.model('Refresh', refreshSchema);

db.Consent = Consent;
db.Passcode = Passcode;
db.User = User;
db.Client = Client;
db.Auth = Auth;
db.Refresh = Refresh;
db.Access = Access;

module.exports = db;
