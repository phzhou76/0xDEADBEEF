var models = require('../models');
/*
 * GET home page.
 */
exports.view = function(req, res){
  res.render('index');
};

exports.add_marker = function(req, res) {
	var form = req.body;
	var newMarker = new models.Marker({
		"picture": form.picture,
    	"topic": form.topic,
    	"type": form.type,
   	 	"comment": form.comment,
    	"score": form.score,
		"lat": form.lat,
		"lng": form.lng
	})

	newMarker.save(afterSaving);

	function afterSaving(err) {
        if(err) {console.log(err); res.send(500);}
        console.log("saving")
        res.redirect('/');
  }
}

exports.get_marker = function(req, res) {
   models.Marker
    .find()
    .exec(afterQuery)

  function afterQuery(err, markers) {
    if(err) console.log(err);
    res.send(markers)
  }
}

exports.get_current_marker = function(req, res) {
  console.log(req.body.lat)
  console.log(req.body.lng)
   models.Marker
    .find({"lat": req.body.lat, "lng": req.body.lng})
    .exec(afterQuery)

  function afterQuery(err, marker) {
    if(err) console.log(err);
    console.log(marker)
    res.send(marker)
  }
}

exports.add_box = function(req, res) {
    var form = req.body;
    console.log(form.content)
	var newBox= new models.InfoBox({
		"content": form.content,
		"lat": form.lat,
		"lng": form.lng
	})

    newBox.save(afterSaving);

	function afterSaving(err) {
        if(err) {console.log(err); res.send(500);}
        res.redirect('/');
    }
}

exports.get_box = function(req, res) {
	models.InfoBox
    .find({"lat": req.body.lat, "lng": req.body.lng})
    .exec(afterQuery)

    function afterQuery(err, infowindow) {
      if(err) {console.log(err); res.send(500);}
      res.send(infowindow)
  }
}

//Delete marker
exports.delete_marker = function(req, res) {
  console.log(req.body.lat)
  console.log(req.body.lng)
  models.Marker
    .find({"lat": req.body.lat, "lng": req.body.lng})
    .remove()
    .exec(afterRemoving);

  function afterRemoving(err) {
    if(err) {console.log(err); res.send(500);}
  }    
}

//Delete marker
exports.delete_box = function(req, res) {
  models.InfoBox
    .find({"lat": req.body.lat, "lng": req.body.lng})
    .remove()
    .exec(afterRemoving);

  function afterRemoving(err) {
    if(err) {console.log(err); res.send(500);}
  }    
}

//Update marker score if main comment, else update comment score
exports.update_score = function(req, res) {
  console.log(req.body.score)
  if(req.body.type == "other") {
  models.Comment
  .find({"lat": req.body.lat, "lng": req.body.lng, "content": req.body.content})
  .update({"score": req.body.score})
  .exec(afterUpdating)
  }

  else {
    models.Marker
    .find({"lat": req.body.lat, "lng": req.body.lng})
    .update({"score": req.body.score})
    .exec(afterUpdating)
  }

    function afterUpdating(err, vote) {
      if(err) {console.log(err); res.send(500);}
  }
}

//Get comments
exports.get_comments = function(req, res) {
  models.Comment
  .find({"lat": req.body.lat, "lng": req.body.lng})
  .exec(afterQuery)

  function afterQuery(err, comments) {
    if(err) {console.log(err); res.send(500);}
    res.send(comments)
  }
}

//Get one comment
exports.get_comment = function(req, res) {
  models.Comment
  .find({"lat": req.body.lat, "lng": req.body.lng, "content": req.body.content})
  .exec(afterQuery)

  function afterQuery(err, comment) {
    if(err) {console.log(err); res.send(500);}
    res.send(comment)
  }
}
//Add comment
exports.add_comment = function(req, res) {
  var form = req.body;
  var newComment = new models.Comment({
    "content": form.content,
    "score": form.score,
    "lat": form.lat,
    "lng": form.lng
  })

  newComment.save(afterSaving);

  function afterSaving(err) {
        if(err) {console.log(err); res.send(500);}
        res.redirect('/');
  }

}