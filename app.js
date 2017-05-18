/**
 * Module dependencies.
 */
var express = require('express');
var http = require('http');
var path = require('path');
var handlebars = require('express-handlebars')
var indexRoutes = require('./routes/indexRoutes');
var app = express();
var mongoose = require('mongoose');

var localHost = true;   // Flag to test on local machine.

// Connect to the Mongo database, whether locally or on Heroku.
var localDatabaseURI = "mongodb://localhost/dejamoo";
var herokuDatabaseURI = (localHost) ? null : "mongodb://dejamoo:0xDEADBEEF@ds153719.mlab.com:53719/heroku_wv684s23";

mongoose.connect(herokuDatabaseURI || localDatabaseURI);

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
app.get('/', indexRoutes.view);
app.get('/getMarkers', indexRoutes.getMarkers);
app.post('/getMarker', indexRoutes.getMarker);
app.post('/getMarkersByType', indexRoutes.getMarkersByType);
app.post('/getComments', indexRoutes.getComments);
app.post('/getComment', indexRoutes.getComment);
app.post('/addMarker', indexRoutes.addMarker);
app.post('/deleteMarker', indexRoutes.deleteMarker);
app.post('/updateScore', indexRoutes.updateScore);
app.post('/addComment', indexRoutes.addComment);
app.post('/addUser', indexRoutes.addUser);
app.post('/getUser', indexRoutes.getUser);
app.post('/login', indexRoutes.login);



http.createServer(app).listen(app.get('port'), function() {
    console.log('Express server listening on port ' + app.get('port'));
});
