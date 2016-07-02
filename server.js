/**
 * Author: Guanqun Bao 6-17-2016
 * Email: guanqun.bao@gmail.com
 * Module dependencies.
 */

var express = require('express'),
    _ = require('underscore'),
    bcrypt = require('bcrypt'),
    expressSession = require('express-session'),
    querystring = require('querystring'),
    logger = require('morgan'),
    mongoose = require('mongoose'),
    bodyParser = require('body-parser'),
    db = require('./models.js'),
    twilio = require('twilio'),
    twilioClient = new twilio.RestClient('AC9c68ea35aee62e08292acd2bcfcf49b6', '938c9c574f9939b1736da9b1a3345c3c');

// Create express application
var app = express();
var PORT = process.env.PORT || 3000;

app.set('PORT', PORT);
app.use(logger('dev'));
app.use(bodyParser());
app.use(expressSession({
    resave: false, // don't save session if unmodified
    saveUninitialized: false, // don't create session until something stored
    secret: 'shhhh, very secret'
}));

// Define scopes
var scopes = {
    openid: 'Informs the Authorization Server that the Client is making an OpenID Connect request.',
    profile: 'Access to the End-User\'s default profile Claims.',
    email: 'Access to the email and email_verified Claims.',
    address: 'Access to the address Claim.',
    phone: 'Access to the phone_number and phone_number_verified Claims.',
    offline_access: 'Grants access to the End-User\'s UserInfo Endpoint even when the End-User is not present (not logged in).'
};


//////////////////////////////////////////
// Application route
//////////////////////////////////////////

// Send a One Time Password to user's phone number 
app.post('/sendCode', function(req, res) {

    var body = _.pick(req.body, 'phone_number');

    if (body.hasOwnProperty('phone_number')) {

        var password = Math.floor(100000 + Math.random() * 900000);

        db.Passcode.findOne({
            phone_number: body.phone_number
        }).exec(function(err, passcode) {
            if (err) {
                return res.status(400).json(err);
            } else if (!passcode) {
                // if no record found, create a new MDN->OTP record
                var newPasscode = new db.Passcode({
                    password: password.toString(),
                    phone_number: body.phone_number.toString()
                });
                newPasscode.save(function(err, passcode) {
                    if (err) {
                        return res.status(400).json(err);
                    } else {
                        twilioClient.sms.messages.create({
                            to: body.phone_number,
                            from: '+1 408-359-4157',
                            body: 'Your confirmation code is:' + password + '. (Valid for 10 mins)'
                        }, function(err, message) {
                            if (!err) {
                                return res.json(passcode);
                            } else {
                                return res.status(400).json(err);
                            }
                        });
                    }
                });

            } else {
                // if an existing record is found, update the existing MDN->OTP record
                passcode.password = password.toString();

                passcode.save(function(err, passcode) {
                    if (err) {
                        return res.status(400).json(err);
                    } else {
                        twilioClient.sms.messages.create({
                            to: body.phone_number,
                            from: '+1 408-359-4157',
                            body: 'Your confirmation code is:' + password + '. (Valid for 10 mins)'
                        }, function(err, message) {
                            if (!err) {
                                return res.json(passcode);
                            } else {
                                return res.status(400).json(err);
                            }
                        });
                    }
                });
            }
        });
    } else return res.status(400).send('error');
});




var validateUser = function(req, next) {
    delete req.session.error;
    db.User.findOne({ phone_number: req.body.phone_number }).exec(function(err, user) {
        if (!err && user) {
            return next(null, user);
        } else {
            var error = new Error('Username or password incorrect.');
            return next(error);
        }
    });
};




// Redirect to login page
app.get('/', function(req, res) {
    res.redirect('/users/login');
});

// Load login form 
app.get('/users/login', function(req, res, next) {
    var head = '<head><title>Login</title></head>';
    var inputs = '<input type="text" name="email" placeholder="Enter Email"/><input type="password" name="password" placeholder="Enter Password"/>';
    var error = req.session.error ? '<div>' + req.session.error + '</div>' : '';
    var body = '<body><h1>Login</h1><form method="POST">' + inputs + '<input type="submit"/></form>' + error;
    res.send('<html>' + head + body + '</html>');
});

// Authenticate user using phone number and SMS!
app.post('/users/login', function(req, res) {

    delete req.session.error;
    delete req.session.success;

    var body = _.pick(req.body, 'phone_number', 'password');
    // test a matching password
    db.Passcode.findOne({ phone_number: body.phone_number }, function(err, passcode) {
        if (err || !passcode) {
            req.session.error = 'Authentication failed, please check your username and password.';
            res.status(401).json(err);
        }
        // test a matching password
        passcode.comparePassword(body.password, function(err, isMatch) {
            if (err || !isMatch) {
                req.session.error = 'Your username and password are not match.';
                res.status(401).json(err);
            }
            db.User.findOne({ phone_number: passcode.phone_number }, function(err, user) {
                if (err || !user) {
                    req.session.error = 'Access denied!';
                    res.status(401).json(err);
                }
                req.session.regenerate(function() {
                    req.session.user = user._id;
                    req.session.success = 'Authenticated as ' + user.phone_number;
                    console.log(req.session);
                    res.redirect('/consent');
                });
            });
        });
    });
});

// Create a new user account
app.post('/users', function(req, res) {
    var body = _.pick(req.body, 'email', 'phone_number', 'password');
    console.log('body: ' + JSON.stringify(body));

    db.Passcode.findOne({ phone_number: body.phone_number }, function(err, passcode) {
        if (err || !passcode) {
            req.session.error = 'Authentication failed, please check your username and password.';
            res.status(401).json(err);
        } else {
            // test a matching password
            passcode.comparePassword(body.password, function(err, isMatch) {
                if (err || !isMatch) {
                    console.log('not match');
                    req.session.error = 'Your username and password are not match.';
                    return res.status(401).json(err);
                }
                var newUser = new db.User({
                    email: body.email,
                    phone_number: body.phone_number
                });
                newUser.save(function(err, user) {
                    if (err || !user) {
                        req.session.error = 'Your account can not be created.';
                        return res.status(401).json(err);
                    }
                    req.session.regenerate(function() {
                        req.session.user = user;
                        req.session.success = 'Authenticated as ' + user.phone_number + ' click to <a href="/logout">logout</a>. ' + ' You may now access <a href="/restricted">/restricted</a>.';
                        return res.redirect('/consent');
                    });
                });
            });
        }
    });
});



app.listen(PORT, function() {
    console.log('Express listening on port ' + PORT + '!');
});
