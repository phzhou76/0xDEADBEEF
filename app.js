/**
 * Module dependencies.
 */

var express = require('express');
var http = require('http');
var path = require('path');
var handlebars = require('express-handlebars')
var index = require('./routes/index_route');
var app = express();
var mongoose = require('mongoose');


// Connect to the Mongo database, whether locally or on Heroku
var local_database_name = 'dejamoo';
var local_database_uri  = 'mongodb://localhost/' + local_database_name
//var uri = "mongodb://sase:saseislyfe@ds023478.mlab.com:23478/heroku_m9jc2gg9";
var uri = "mongodb://dejamoo:0xDEADBEEF@ds153719.mlab.com:53719/heroku_wv684s23";
var database_uri = uri || local_database_uri;
mongoose.connect(database_uri);

var index = require('./routes/index_route')

// All environments.
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.engine('handlebars', handlebars());
app.set('view engine', 'handlebars');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.cookieParser('Deja Moo'));
app.use(express.session({
    secret: 'moo_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: true
    }
}));
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// Development only.
if ('development' == app.get('env')) {
    app.use(express.errorHandler());
}

// Add routes here.
app.get('/', index.view);
app.post('/add_marker', index.add_marker);
app.post('/add_box', index.add_box)
app.get('/get', index.get_marker);
app.post('/get_current_marker', index.get_current_marker)
app.post('/get_box', index.get_box)
app.post('/delete_marker', index.delete_marker)
app.post('/delete_box', index.delete_box)
app.post('/update_score', index.update_score)
app.post('/get_comments', index.get_comments)
app.post('/get_comment', index.get_comment)
app.post('/add_comment', index.add_comment)


http.createServer(app).listen(app.get('port'), function() {
    console.log('Express server listening on port ' + app.get('port'));
    console.log(database_uri)
});
