/**
 * Author: Guanqun Bao 6-17-2016
 * Email: guanqun.bao@gmail.com
 * Module dependencies.
 */

var express = require('express'),
    expressSession = require('express-session'),
    querystring = require('querystring'),
    logger = require('morgan'),
    mongoose = require('mongoose'),
    bodyParser = require('body-parser');

//Create express application
var app = express();
var PORT = process.env.PORT || 3000;

//Connect to mongodb
var mongodb = 'mongodb://localhost/crazylogin'
mongoose.connect(mongodb);
var db = require('./models.js');

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


app.post('/client', function(req, res) {
    var newClient = new db.Client();

    newClient.client_id = req.body.client_id;
    newClient.client_secret = req.body.client_secret;
    newClient.redirect_uris = req.body.redirect_uris;

    newClient.save(function(err, client) {
        if (err) {
            res.send('error saving client');
        } else {
            console.log(client);
            res.send(client);
        }
    });
});




app.listen(PORT, function() {
    console.log('Express listening on port ' + PORT + '!');
});
