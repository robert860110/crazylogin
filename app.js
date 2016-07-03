/**
 * Module dependencies.
 */

var express = require('express');


//Create express application
var app = express();

var PORT = process.env.PORT || 3000;
app.set('port', process.env.PORT || 3000);


//app.use(expressSession({ store: new RedisStore({ client: redis }), secret: secret }));

app.get('/', function(req, res) {

    var arrayOfChildrenNames = ['Amir Rahnama', 'Mahshid Rahnama', 'sd'];
    var arrayOfFamilyMemberNames = ['Davood Rahnama', 'Maryam Toloo', 'Amir Rahnama', 'Mahshid Rahnama'];

    var isarrayOfNamesSubsetOfFamily = arrayOfChildrenNames.every(function(val) {
        return arrayOfFamilyMemberNames.indexOf(val) >= 0;
    });
    console.log(isarrayOfNamesSubsetOfFamily); // true



    var str = 'How+are+you';
    var result = str.split('+');
    console.log(result);

});

app.listen(PORT, function() {
    console.log('Express listening on port ' + PORT + '!');
});
