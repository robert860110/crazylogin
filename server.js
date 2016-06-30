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

//Create express application
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

//Define scopes
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
                // if no record found, create a new record
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
                // if an existing record is found, update the existing record
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







// Redirect to login page
app.get('/', function(req, res) {
    res.redirect('/login');
});

// Load login form 
app.get('/login', function(req, res, next) {
    var head = '<head><title>Login</title></head>';
    var inputs = '<input type="text" name="email" placeholder="Enter Email"/><input type="password" name="password" placeholder="Enter Password"/>';
    var error = req.session.error ? '<div>' + req.session.error + '</div>' : '';
    var body = '<body><h1>Login</h1><form method="POST">' + inputs + '<input type="submit"/></form>' + error;
    res.send('<html>' + head + body + '</html>');
});

// Authenticate user using phone number and SMS!


function restrict(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        req.session.error = 'Access denied!';
        res.redirect('/login');
    }
}

// // create a user a new user
// var testPasscode = new db.Passcode({
//     phone_number: '12331312',
//     password: 'Password123'
// });


// // save user to database
// testPasscode.save(function(err) {
//     if (err) throw err;

//     // fetch user and test password verification
//     db.Passcode.findOne({ phone_number: '12321312' }, function(err, passcode) {
//         if (err) throw err;

//         // test a matching password
//         passcode.comparePassword('Password123', function(err, isMatch) {
//             if (err) throw err;
//             console.log('Password123:', isMatch); // -> Password123: true
//         });

//         // test a failing password
//         passcode.comparePassword('123Password', function(err, isMatch) {
//             if (err) throw err;
//             console.log('123Password:', isMatch); // -> 123Password: false
//         });
//     });
// });

// testPasscode.findOneAndUpdate({
//     phone_number: testPasscode.phone_number
// }, {
//     $set: { password: req.body.title }
// }, { upsert: true }, function(err, newBook) {
//     if (err) {
//         res.send('error updating ');
//     } else {
//         console.log(newBook);
//         res.send(newBook);
//     }
// });

// User login
// app.post('users/login', function(req, res) {
//     var body = _.pick(req.body, 'mdn', 'password');
//     authenticate(req.body.username, req.body.password, function(err, user) {
//         if (user) {
//             // Regenerate session when signing in
//             // to prevent fixation
//             req.session.regenerate(function() {
//                 // Store the user's primary key
//                 // in the session store to be retrieved,
//                 // or in this case the entire user object
//                 req.session.user = user;
//                 req.session.success = 'Authenticated as ' + user.name + ' click to <a href="/logout">logout</a>. ' + ' You may now access <a href="/restricted">/restricted</a>.';
//                 res.redirect('back');
//             });
//         } else {
//             req.session.error = 'Authentication failed, please check your ' + ' username and password.' + ' (use "tj" and "foobar")';
//             res.redirect('/login');
//         }
//     });
// });


// POST /users/login
// app.post('/users/login', function(req, res) {

//     var body = _.pick(req.body, 'mdn', 'password');

//     db.password.authenticate(body).then(function(password) {
//         return db.user.findByMdn(body.mdn);
//     }).then(function(user) {

//         req.session.regenerate(function() {
//             // Store the user's primary key
//             // in the session store to be retrieved,
//             // or in this case the entire user object
//             req.session.user = user;
//             req.session.success = 'Authenticated as ' + user.mdn + ' click to <a href="/logout">logout</a>. ' + ' You may now access <a href="/restricted">/restricted</a>.';
//             res.redirect('/chat');
//         });

//         //res.json(user.toPublicJSON());
//     }).catch(function(error) {
//         req.session.error = 'Authentication failed, please check your username and password.';
//         res.status(401).json(error);
//     });

// });





// app.post('/client', function(req, res) {
//     var newClient = new db.Client();

//     newClient.client_id = req.body.client_id;
//     newClient.client_secret = req.body.client_secret;
//     newClient.redirect_uris = req.body.redirect_uris;

//     newClient.save(function(err, client) {
//         if (err) {
//             res.send('error saving client');
//         } else {
//             console.log(client);
//             res.send(client);
//         }
//     });
// });




app.listen(PORT, function() {
    console.log('Express listening on port ' + PORT + '!');
});
