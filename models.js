var Mongoose = require('mongoose');

var MarkerSchema = new Mongoose.Schema({
    topic: String,
    type: String,
    comment: String,
    score: Number,
    lat: Number,
    lng: Number
}, {
    autoIndex: false // Index creation has significant performance impact.
});

var CommentSchema = new Mongoose.Schema({
    content: String,
    score: Number,
    lat: Number,
    lng: Number,
    date: {
        type: Date,
        default: Date.now
    }
}, {
    autoIndex: false
});

// Init models for use as document objects.
exports.ModelMarker = Mongoose.model('Marker', MarkerSchema);
exports.ModelComment = Mongoose.model('Comment', CommentSchema);
