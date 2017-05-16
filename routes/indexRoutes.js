var models = require('../models');

/**
 * GET function: Used to render index.handlebar.
 * @param {object} req - The GET request.
 * @param {object} res - The result of the GET request.
 */
exports.view = function(req, res) {
    res.render('index');
};

/**
 * POST function: Used to save a marker that was placed on the map.
 * @param {object} req - The information to be stored in the database.
 * @param {object} res - The result of the POST request.
 */
exports.addMarker = function(req, res) {
    var newMarker = new models.ModelMarker({
        topic: req.body.topic,
        type: req.body.type,
        comment: req.body.comment,
        score: req.body.score,
        lat: req.body.lat,
        lng: req.body.lng
    })

    // Save marker document to the database.
    newMarker.save(function(err) {
        if (err) {
            console.log(err);
            res.send(500);
        } else {
            res.redirect('/');
        }
    });
};

/**
 * GET function: Obtains all markers in database.
 * @param {object} req - The GET request.
 * @param {object} res - The resulting markers.
 */
exports.getMarker = function(req, res) {
    models.ModelMarker
        .find()
        .exec(function(err, markers) {
            if (err) {
                console.log(err);
                res.send(400);
            } else {
                res.send(markers);
            }
        });
};

/**
 * POST request: Deletes a marker at a specified coordinate point.
 * @param {object} req - Contains the latitude and longtitude coordinates.
 * @param {object} res - Should be empty if the deletion was successful.
 */
exports.deleteMarker = function(req, res) {
    models.ModelMarker
        .find({
            lat: req.body.lat,
            lng: req.body.lng
        })
        .remove()
        .exec(function(err) {
            if (err) {
                console.log(err);
                res.send(500);
            }
        });
};

/**
 * POST request: Updates the marker score in the database if the main comment's
 * score was changed, otherwise updates the comment score in the database.
 * @param {object} req - Contains info on the comment to update.
 * @param {object} res - The result of the post request.
 */
exports.updateScore = function(req, res) {
    function afterUpdating(err) {
        if (err) {
            console.log(err);
            res.send(500);
        }
    }

    if (req.body.type == other) {
        models.Comment
            .find({
                content: req.body.content,
                lat: req.body.lat,
                lng: req.body.lng,
                date: req.body.date
            })
            .update({
                score: req.body.score
            })
            .exec(afterUpdating)
    } else {
        models.Marker
            .find({
                lat: req.body.lat,
                lng: req.body.lng
            })
            .update({
                score: req.body.score
            })
            .exec(afterUpdating)
    }
};

/**
 * GET request: Grabs all comments at a certain coordinate location.
 * @param {object} req - The location of the comments.
 * @param {object} res - The comments found in the database.
 */
exports.getComments = function(req, res) {
    models.Comment
        .find({
            lat: req.body.lat,
            lng: req.body.lng
        })
        .exec(function(err, comments) {
            if (err) {
                console.log(err);
                res.send(500);
            } else {
                res.send(comments);
            }
        });
};

/**
 * GET request: Gets a specific comment at a certain location.
 * @param {object} req - The location, contents, score, and date of creation of the comment.
 * @param {object} res - The comment found in the database.
 */
exports.getComment = function(req, res) {
    models.Comment
        .find({
            content: req.body.content,
            score: req.body.score,
            lat: req.body.lat,
            lng: req.body.lng,
            date: req.body.date
        })
        .exec(function(err, comment) {
            if (err) {
                console.log(err);
                res.send(500);
            } else {
                res.send(comment);
            }
        });
};

/**
 * POST request: Saves an added comment to the database.
 * @param {object} req - The location, contents, score, and date of creation of the comment.
 * @param {object} res - Should be empty if successful.
 */
exports.addComment = function(req, res) {
    var newComment = new models.Comment({
        content: req.body.content,
        score: req.body.score,
        lat: req.body.lat,
        lng: req.body.lng,
        date: req.body.date
    });

    newComment.save(function(err) {
        if(err) {
            console.log(err);
            res.send(500);
        }
        else {
            res.redirect('/');
        }
    });
};
