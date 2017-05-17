
/*
  This script will initialize a local Mongo database
  on your machine so you can do development work.

  IMPORTANT: You should make sure the

      local_database_name

  variable matches its value in app.js  Otherwise, you'll have
  initialized the wrong database.
*/

var mongoose = require('mongoose');
var models   = require('./models');

// Connect to the Mongo database, whether locally or on Heroku
// MAKE SURE TO CHANGE THE NAME FROM 'lab7' TO ... IN OTHER PROJECTS
var local_database_name = 'dejamoo';
var local_database_uri  = 'mongodb://localhost/' + local_database_name
var uri = "mongodb://dejamoo:0xDEADBEEF@ds153719.mlab.com:53719/heroku_wv684s23";
//var uri = "mongodb://sase:saseislyfe@ds023478.mlab.com:23478/heroku_m9jc2gg9";
var database_uri = uri || local_database_uri;
console.log(database_uri)
mongoose.connect(database_uri);


// Do the initialization here

// Step 1: load the JSON data
var markers_json = require('./markers.json')

// Step 2: Remove all existing documents

models.InfoBox
  .find()
  .remove()
  .exec(clearInfo)

models.Comment
  .find()
  .remove()
  .exec(clearComment)

models.Marker
  .find()
  .remove(onceClear)



function clearInfo(err) {
    var newBox = new models.InfoBox({
    "content": "Hello",
    "lat": 32.8698645954428,
    "lng": -117.22189486026764
  })

    newBox.save()

  var newBox = new models.InfoBox({
    "content": "Pizza",
    "lat": 32.8799645954428,
    "lng": -117.22199486026761
  })

  newBox.save()
}

function clearComment(err) {
    var newComment = new models.Comment({
    "content": "It's great",
    "score": 0,
    "lat": 32.8698645954428,
    "lng": -117.22189486026764
    })

    newComment.save()

    var newComment = new models.Comment({
    "content": "Amazing",
    "score": 0,
    "lat": 32.8698645954428,
    "lng": -117.22189486026764
    })

    newComment.save()

  var newComment = new models.Comment({
    "content": "Super long line",
    "score": 0,
    "lat": 32.8799645954428,
    "lng": -117.22199486026761
  })

  newComment.save()
}

// Step 3: load the data from the JSON file
function onceClear(err) {
  if(err) console.log(err);

  // loop over the markers, construct and save an object from each one
  // Note that we don't care what order these saves are happening in...
  var to_save_count = markers_json.length;
  for(var i=0; i<markers_json.length; i++) {
    var json = markers_json[i];
    var marker = new models.Marker(json);

    marker.save(function(err, marker) {
      if(err) console.log(err);

      to_save_count--;
      console.log(to_save_count + ' left to save');
      if(to_save_count <= 0) {
        console.log(database_uri)
        console.log('DONE');
        mongoose.connection.close()

        // The script won't terminate until the 
        // connection to the database is closed
      }
    });
  }
}
