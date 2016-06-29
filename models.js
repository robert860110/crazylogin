var mongoose = require('mongoose');
var Schema = mongoose.Schema;

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
    password_hash: { type: String, required: true, trim: true }
}, {
    timestamps: true
});

// create a User schema
var userSchema = new Schema({
    name: String,
    given_name: String,
    middle_name: String,
    family_name: String,
    profile: String,
    email: { type: String, required: true, unique: true, trim: true },
    gender: String,
    birthday: Date,
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
