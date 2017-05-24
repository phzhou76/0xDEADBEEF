var Mongoose = require('mongoose');

var MarkerSchema = new Mongoose.Schema({
    topic: String,
    type: String,
    numComments: Number, // Total number of comments that this marker contains.
    lat: Number,
    lng: Number,
    date: {
        type: Date,
        default: Date.now
    },
    userID: String
}, {
    autoIndex: false // Index creation has significant performance impact.
});

var CommentSchema = new Mongoose.Schema({
    content: String,
    score: Number,
    index: Number, // Index 0 is the main comment.
    lat: Number,
    lng: Number,
    date: {
        type: Date,
        default: Date.now
    }
}, {
    autoIndex: false
});


var UserSchema = new Mongoose.Schema({
    username: String,
    password: String,

}, {
    autoIndex: false
});

var VoteSchema = new Mongoose.Schema({
    commentID: String,
    username: String,
    score: Number
})


// Init models for use as document objects.
exports.ModelMarker = Mongoose.model('Marker', MarkerSchema);
exports.ModelComment = Mongoose.model('Comment', CommentSchema);
exports.ModelUser = Mongoose.model('User', UserSchema);
exports.ModelVote = Mongoose.model('Vote', VoteSchema);