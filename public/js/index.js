var googleMapObject;    // The Google Maps object.
var watchID;            // Used to disable continuous tracking of user's location.
var dropMode;           // True if the user is trying to drop a cow.

var userMarkers = {     // Holds marker marking current position and nearby area.
    center: null,
    radius: null
};

var currCow = {         // Holds contents of currently expanded message.
    infoBox: null,
    previewBox: null,
    marker: null
};

var zoomImages = [];    // Holds different image sizes for different zoom amounts.

var cowBtnText;         // Used to modify the drop cow button text.
var deleteContainer;    // Used to modify the location of the delete message button.

var lastLocation;       // Location of the last click before drop was clicked.

// Used to store markers for clustering.
var markerCluster;
var markerClusterElmts = [];

/**
 * Initializes the Google Map and geolocation settings.
 */
function initMap() {
    dropMode = false;
    $("#map-loading").fadeOut();
    googleMapObject = new google.maps.Map(document.getElementById('map'), {
        center: {
            lat: 0.0,
            lng: 0.0
        },
        zoom: 15,
        mapTypeControl: false,
        streetViewControl: false
    });

    // If geolocation services do not exist, this app should not do anything.
    if (navigator.geolocation) {
        // Google Maps API has loaded, init image settings.
        zoomImages.push({
            url: 'img/self.png',
            size: new google.maps.Size(12.5, 12.5),
            scaledSize: new google.maps.Size(12.5, 12.5)
        });
        zoomImages.push({
            url: 'img/self.png',
            size: new google.maps.Size(25, 25),
            scaledSize: new google.maps.Size(25, 25)
        });
        zoomImages.push({
            url: 'img/self.png',
            size: new google.maps.Size(50, 50),
            scaledSize: new google.maps.Size(50, 50)
        });

        getGeoPosition();
        initMapListenersButtons();
        initMapListeners();
        initModalListeners();

        markerCluster = new MarkerClusterer(googleMapObject, markerClusterElmts, {
            imagePath: 'img/cow.png'
        });
    }
}

/**
 * Continuously tracks the user's location, and sets the map's current center
 * to the user's current location. Also initializes the markers required to
 * allow the user to see their location.
 */
function getGeoPosition() {
    // Create a marker for the map center.
    userMarkers.center = new google.maps.Marker({
        icon: zoomImages[0],
        map: googleMapObject
    });

    // Create a marker that constantly surrounds the map center marker.
    userMarkers.radius = new google.maps.Circle({
        map: googleMapObject,
        radius: 150,
        fillColor: 'rgba(30, 30, 30, 0.3)',
        strokeWeight: 4,
        strokeColor: 'rgba(45, 252, 142, 0.5)'
    });

    userMarkers.radius.bindTo('center', userMarkers.center, 'position');
    userMarkers.radius.setVisible(false);

    // Set listeners to allow for message drops on the markers.
    google.maps.event.addDomListener(userMarkers.center, 'click', function(event) {
        lastLocation = event.latLng;
        return dropClick();
    });
    google.maps.event.addDomListener(userMarkers.radius, 'click', function(event) {
        lastLocation = event.latLng;
        return dropClick();
    });

    // watchID can be used to disable continuous geolocation tracking.
    watchID = navigator.geolocation.watchPosition(function(position) {
        // Set the center of the map to the user's location.
        var currPosition = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
        };
        googleMapObject.setCenter(currPosition);
        userMarkers.center.setPosition(currPosition);
    });
}

/**
 * Inits listeners for the map.
 */
function initMapListeners() {
    // Setup the map listener for any changes in zoom.
    google.maps.event.addDomListener(googleMapObject, 'zoom_changed',
        function() {
            // Adjust size of position icon depending on zoom.
            if (googleMapObject.getZoom() < 17) {
                userMarkers.center.setIcon(zoomImages[0]);
            } else if (googleMapObject.getZoom() >= 17 && googleMapObject.getZoom() < 20) {
                userMarkers.center.setIcon(zoomImages[1]);
            } else {
                userMarkers.center.setIcon(zoomImages[2]);
            }

            if (dropMode) {
                if ($("#guide-footer").hasClass('active') == false) {
                    $("#guide-footer").addClass('active');
                }
                if (googleMapObject.getZoom() < 17) {
                    userMarkers.radius.setVisible(false);
                    $("#guide-text").text("Too far zoomed out!");
                    $("#guide-text").css('color', 'rgba(209, 44, 29, 1)');
                } else {
                    userMarkers.radius.setVisible(true);
                    $("#guide-text").text("Drop a cow within the gray area.");
                    $("#guide-text").css('color', 'rgba(43, 132, 237, 1)');
                }
            }
        });

    // Setup the map listener for any clicks on the map.
    google.maps.event.addListener(googleMapObject, 'click', function(event) {
        // If drop mode is enabled, there should not be clicks outside of radius.
        if (dropMode) {
            if ($("#guide-footer").hasClass('active') == false) {
                $("#guide-footer").addClass('active');
            }
            $("#guide-text").text("Incorrect area - select a place within the grey circle.");
            $("#guide-text").css('color', 'rgba(209, 44, 29, 1)');
        }
        // If the map is clicked while not in drop mode, then shrink the current message open.
        else {
            if (currCow.infoBox != null && currCow.previewBox != null && currCow.marker != null) {
                shrinkMessage(currCow.infoBox, currCow.previewBox);
                currCow.infoBox = currCow.previewBox = currCow.marker = null;
            }
        }
    });
}

/**
 * Inits the listeners for the modals.
 */
function initModalListeners() {
    // Inits click for the drop message modal.
    $('#drop').click(function(event) {
        var topic = document.getElementById("topic");
        var comments = document.getElementById("comments");
        var type = document.getElementById("type");

        // All fields must be filled to spawn a message.
        if (topic != null && topic.value != "" &&
            comments != null && comments.value != "" &&
            type != null && type.value != "") {
            addCowPin(lastLocation, topic.value, comments.value, type.value);
        }

        // Reset values for the three fields.
        document.getElementById("topic").value = "";
        document.getElementById("comments").value = "";
    });

    // Inits click for the view comments modal.
    $('#add').click(addComment);
}

/**
 * Calls respective functions to create custom buttons for the map.
 */
function initMapListenersButtons() {
    initDropButton();
    initDeleteButton();
    initMarkers();
}

/**
 * Creates a custom map button to allow toggling of message-dropping
 * functionality.
 */
function initDropButton() {
    // Create a div that holds the cow-dropping button.
    var cowBtnContainer = document.createElement('div');

    // Set the CSS for the button's border.
    var cowBtnBorder = document.createElement('div');
    cowBtnBorder.style.backgroundColor = 'rgba(43, 132, 237, 1.0)';
    cowBtnBorder.style.cursor = 'pointer';
    cowBtnBorder.style.textAlign = 'center';
    cowBtnBorder.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.3)';
    cowBtnContainer.appendChild(cowBtnBorder);

    // Set the CSS for the button's interior content.
    cowBtnText = document.createElement('div');
    cowBtnText.style.color = '#fff';
    cowBtnText.style.fontFamily = 'Arial,sans-serif';
    cowBtnText.style.fontSize = '16px';
    cowBtnText.style.lineHeight = '38px';
    cowBtnText.style.paddingLeft = '10px';
    cowBtnText.style.paddingRight = '10px';
    cowBtnText.innerHTML = 'Drop a Cow!';
    cowBtnBorder.append(cowBtnText);

    // Inserts the finished button to the right-center area of the map.
    googleMapObject.controls[google.maps.ControlPosition.RIGHT_CENTER].push(cowBtnContainer);

    // Setup the map listener for the button.
    google.maps.event.addDomListener(cowBtnContainer, 'click', function() {
        return dropText();
    });
}

/**
 * Creates a custom map button that allows the user to delete their own
 * created messages.
 */
function initDeleteButton() {
    // Create a div that holds the delete message button.
    deleteContainer = document.createElement('div');
    deleteContainer.style.padding = "10px 10px 0px 0px";
    deleteContainer.className = "options";

    // Set the CSS for the button's border.
    var deleteBorder = document.createElement('div');
    deleteBorder.style.backgroundColor = 'rgba(43, 132, 237, 1.0)';
    deleteBorder.style.cursor = 'pointer';
    deleteBorder.style.textAlign = 'center';
    deleteBorder.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.3)';
    deleteContainer.appendChild(deleteBorder);

    // Set the CSS for the button's interior content.
    var deleteImg = document.createElement('img');
    deleteImg.setAttribute('src', 'img/delete.png');
    deleteBorder.appendChild(deleteImg);

    // Inserts the finished button to the right-bottom area of the map.
    googleMapObject.controls[google.maps.ControlPosition.RIGHT_CENTER].push(deleteContainer);

    // Setup the map listener for the button.
    google.maps.event.addDomListener(deleteContainer, 'click', function() {
        return deleteMessage();
    });
}

/**
 * Load initial markers from the database.
 */
function initMarkers() {
    $.get("getMarker", function(markers) {
        for (var i = 0; i < markers.length; i++) {
            initMarkersHelper(markers[i]);
        }
    });
}

/**
 * Create a marker, given the marker data from the database.
 * @param {object} markerData - The data of the individual marker.
 */
function initMarkersHelper(markerData) {
    var location = {
        lat: markerData.lat,
        lng: markerData.lng
    };

    var picture = {
        url: chooseImage(markerData.type),
        size: new google.maps.Size(50, 50),
        scaledSize: new google.maps.Size(50, 50),
        labelOrigin: new google.maps.Point(20, 50)
    };

    var marker = new google.maps.Marker({
        position: location,
        map: googleMapObject,
        icon: picture
    });

    var infoBox = initInfoBox(markerData.topic, markerData.comment, markerData.score);
    var previewBox = initPreviewBox(markerData.topic);

    initMarkerListener(marker, infoBox, previewBox);
    disableDrop();

    markerCluster.addMarker(marker, true);

    // Attach both info boxes to the marker.
    infoBox.open(googleMapObject, marker);
    previewBox.open(googleMapObject, marker);
}

/**
 * Modifies the text of the message drop button, as well as the guide text.
 */
function dropText() {
    if (!dropMode) {
        enableDrop();
    } else {
        disableDrop();
    }
}

/**
 * Enables the message drop mode.
 */
function enableDrop() {
    cowBtnText.innerHTML = "Cancel";
    dropMode = true;

    // Only let the radius appear if the user is dropping a message.
    userMarkers.radius.setVisible(true);
    googleMapObject.panTo(userMarkers.center.position);
    googleMapObject.setZoom(18);
    if ($("#guide-footer").hasClass('active') == false) {
        $("#guide-footer").addClass('active');
    }
    $("#guide-text").text('Drop a cow within the gray area.');
    $("#guide-text").css('color', 'rgba(43, 132, 237, 1)');

    // Remove the add comment and delete pin functionality if drop mode is true.
    deleteContainer.className = "options inactive";
}

/**
 * Disables the message drop mode.
 */
function disableDrop() {
    cowBtnText.innerHTML = "Drop a Cow!";
    dropMode = false;
    userMarkers.radius.setVisible(false);
    if ($("#guide-footer").hasClass('active')) {
        $("#guide-footer").removeClass('active');
    }

    // Add the add comment and delete pin functionality if drop mode is false.
    deleteContainer.className = "options";
}

/**
 * Event listener for any clicks on the center or radius marker.
 */
function dropClick() {
    if (dropMode) {
        if ($("#guide-footer").hasClass('active') == false) {
            $("#guide-footer").addClass('active');
        }
        $("#guide-text").text('What\'s your next moove?');
        $("#guide-text").css('color', 'rgba(43, 132, 237, 1)');
        $('#cowModal').modal('show'); // Reveals the modal.

        // Reverts text if the modal somehow exits.
        $("#cowModal").on('hidden.bs.modal', function() {
            $("#guide-text").text('Drop a cow within the gray area.');
            $("#guide-text").css('color', 'rgba(43, 132, 237, 1)');
        });
    }
}

/**
 * Adds a message pin to the clicked area.
 * @param {object} location - Contains latitude and longtitude coordinates.
 * @param {string} topic - Contains the topic for the message.
 * @param {string} comments - Contains the comments for the message.
 * @param {object} type - Contains the type of the message.
 */
function addCowPin(location, topic, comments, type) {
    var picture = {
        url: chooseImage(type),
        size: new google.maps.Size(50, 50),
        scaledSize: new google.maps.Size(50, 50)
    };

    // Post marker info to route to save to database.
    var markerInfo = {
        topic: topic,
        type: type,
        comment: comments,
        score: 0,
        lat: location.lat(),
        lng: location.lng()
    };

    $.post("addMarker", markerInfo);

    var marker = new google.maps.Marker({
        position: location,
        map: googleMapObject,
        icon: picture,
        animation: google.maps.Animation.DROP,
    });
    markerCluster.addMarker(marker, true);
    currCow.marker = marker;

    var infoBox = initInfoBox(topic, comments, 0);
    var previewBox = initPreviewBox(topic);

    initMarkerListener(marker, infoBox, previewBox);
    disableDrop();

    // Attach both info and preview boxes to the marker.
    window.setTimeout(function() {
        infoBox.open(googleMapObject, marker);
    }, 600);
    previewBox.open(googleMapObject, marker);

    googleMapObject.panTo(location);
}

/**
 * Inits the contents of the info box.
 * @param {string} topic - The topic of the message.
 * @param {string} comments - The comment of the message.
 * @param {number} score - The score of the comment.
 * @return {object} The created info box.
 */
function initInfoBox(topic, comments, score) {
    // Initialize the info box.
    var infoBox = new InfoBox({
        pixelOffset: new google.maps.Size(-150, -200),
        enableEventPropagation: false,
        closeBoxURL: ""
    });

    setInfoBoxVisibility(infoBox, true, true);

    // Initialize the topic.
    var topicHTML = document.createElement('h3');
    var topicContent = document.createTextNode(topic);
    topicHTML.className += 'topic-header';
    topicHTML.appendChild(topicContent);

    // Initialize the votes and message.
    var commentHTML = document.createElement('table');
    commentHTML.appendChild(parseComment(comments, score));

    // Initialize a button to trigger a comment-showing modal.
    var viewHTML = document.createElement('div');
    viewHTML.style.backgroundColor = 'rgba(43, 132, 237, 1.0)';
    viewHTML.style.cursor = 'pointer';
    viewHTML.style.textAlign = 'center';
    viewHTML.style.margin = '-3px';
    viewHTML.addEventListener('click', loadComments);

    // Set the CSS for the button's interior content.
    var viewText = document.createElement('div');
    viewText.style.color = '#fff';
    viewText.style.fontFamily = 'Arial,sans-serif';
    viewText.style.fontSize = '16px';
    viewText.style.lineHeight = '38px';
    viewText.style.paddingLeft = '10px';
    viewText.style.paddingRight = '10px';
    viewText.innerHTML = 'View Comments';
    viewHTML.append(viewText);

    // Combine into one div.
    var messageHTML = document.createElement('div');
    messageHTML.appendChild(topicHTML);
    messageHTML.appendChild(commentHTML);
    messageHTML.appendChild(viewHTML);

    infoBox.setContent(messageHTML);

    return infoBox;
}

/**
 * Inits the contents of the preview box.
 * @param {string} topic - The topic of the message.
 * @return {object} The created preview box.
 */
function initPreviewBox(topic) {
    // Initialize the preview box.
    var previewBox = new InfoBox({
        pixelOffset: new google.maps.Size(-75, -75),
        enableEventPropagation: false,
        closeBoxURL: ""
    });

    setInfoBoxVisibility(previewBox, false, false);

    // Initialize the preview window with just the topic.
    var previewHTML = document.createElement('h3');
    previewHTML.className += 'topic-header';
    previewHTML.innerHTML = topic;
    previewBox.setContent(previewHTML);

    return previewBox;
}

/**
 * Inits event listeners for the marker.
 * @param {object} marker - The marker that the listener will be attached to.
 * @param {object} infoBox - The info box attached to the marker that displays the
 *      the full message.
 * @param {object} previewBox - The info box attached to the marker that displays
 *      only the topic.
 */
function initMarkerListener(marker, infoBox, previewBox) {
    // Create bounce animation when moving over cow marker.
    marker.addListener('mouseover', function() {
        if (marker.getAnimation() == null) {
            setTimeout(function() {
                marker.setAnimation(google.maps.Animation.BOUNCE);
            }, 150);
            setTimeout(function() {
                marker.setAnimation(null);
            }, 2950);
        }
    });

    // When the marker is clicked on, the message will be expanded.
    marker.addListener('click', function() {
        enlargeMessage(marker, infoBox, previewBox);
    });
    shrinkMessage(infoBox, previewBox);
}

/**
 * Sets the visibility of an info box. Can be used for preview boxes too.
 * @param {object} infoBox - The info box to set the opacity of.
 * @param {bool} visible - True if visibility desired, false otherwise.
 * @param {bool} isInfoBox - True if info box, false if preview box.
 */
function setInfoBoxVisibility(infoBox, visible, isInfoBox) {
    infoBox.setOptions({
        boxStyle: {
            borderRadius: "10px",
            border: "6px solid rgba(43, 132, 237, 0.5)",
            textAlign: "center",
            fontSize: "12pt",
            width: (isInfoBox) ? "300px" : "150px",
            display: (visible) ? "block" : "none",
            backgroundColor: "rgba(255, 255, 255, 1.0)"
        }
    });
}

/**
 * Given the location of a marker, the message attached to that marker will
 * shrink down to the topic-only message.
 * @param {object} infoBox - The expanded info box of the message.
 * @param {object} previewBox - The shrunk down preview box of the message.
 */
function shrinkMessage(infoBox, previewBox) {
    setInfoBoxVisibility(infoBox, false, true);
    setInfoBoxVisibility(previewBox, true, false);
}

/**
 * Given the location of a marker, the message attached to that marker will
 * expand to the full message.
 * @param {object} marker - The marker that was clicked on to enlarge its message.
 * @param {object} infoBox - The info box object that will be expanded.
 * @param {object} previewBox - The info box object that will disappear.
 */
function enlargeMessage(marker, infoBox, previewBox) {
    // Shrink the contents of the previously opened message, if available.
    if (currCow.infoBox != null && currCow.previewBox != null) {
        shrinkMessage(currCow.infoBox, currCow.previewBox);
    }

    currInfo = infoBox;
    currPreview = previewBox;

    setInfoBoxVisibility(infoBox, true, true);
    setInfoBoxVisibility(previewBox, false, false);

    googleMapObject.panTo({
        marker.position.lat(),
        marker.position.lng()
    });
}

/**
 * Based on the type, returns a URL for the correct image.
 * @param {string} type - The type of the message.
 * @return {string} The location of the image.
 */
function chooseImage(type) {
    if (type == "Food") {
        return 'img/cow-food.png';
    } else if (type == "Event") {
        return 'img/cow-event.png';
    } else if (type == "Sales") {
        return 'img/cow-sales.png';
    } else {
        return 'img/cow.png';
    }
}

/**
 * Takes in a string, and converts it to a table element for the info window.
 * @param {string} comments - The details of the message.
 * @param {int} score - The score of that comment.
 * @return {object} The DOM object that contains the message details.
 */
function parseComment(comments, score, isOtherComment) {
    var tableRow = document.createElement('tr');

    // Init voting segment.
    var voteHeader = document.createElement('th');
    var voteDiv = document.createElement('div');
    voteDiv.className += 'vote chev';
    var upvoteDiv = document.createElement('div');
    upvoteDiv.className += 'increment up';
    upvoteDiv.addEventListener('click', addUpvote);
    var downvoteDiv = document.createElement('div');
    downvoteDiv.className += 'increment down';
    downboteDiv.addEventListener('click', addDownvote);
    var countDiv = document.createElement('div');
    countDiv.className += 'count';
    countDiv.id = comments;
    countDiv.innerHTML = score;

    // Adds id if it is not the main comment.
    if (isOtherComment == true) {
        countDiv.value = "other";
    }

    // Init comment segment.
    var commentHeader = document.createElement('th');
    var commentDiv = document.createElement('div');
    commentDiv.className += 'comment';
    commentDiv.innerHTML = comments;

    // Put the two headers together into the row of the table.
    tableRow.appendChild(voteHeader);
    tableRow.appendChild(commentHeader);

    voteHeader.appendChild(voteDiv);
    voteDiv.appendChild(upvoteDiv);
    voteDiv.appendChild(downvoteDiv);
    voteDiv.appendChild(countDiv);

    commentHeader.appendChild(commentDiv);

    return tableRow;
}

/**
 * Loads the contents of one message cow into the modal.
 */
function loadComments() {
    // Clear the contents of the modal.
    var commentsDiv = document.getElementById("comments-div");
    if (commentsDiv != null) {
        commentsDiv.innerHTML = "";
    }

    // Recreate the contents of the message.
    var topicHeader = document.getElementById("topic-header");
    if (topicHeader != null) {
        topicHeader.innerHTML = currCow.marker.topic;
    }

    var mainComment = document.createElement('table');
    mainComment.className += 'comments-table';
    mainComment.id = 'main-comment';
    mainComment.appendChild(parseComment(currCow.marker.comment, currCow.marker.score));
    commentsDiv.appendChild(mainComment);

    $.post("get_comments", {
        "lat": currCow.marker.position.lat(),
        "lng": currCow.marker.position.lng(),
    }, function(comments) {

        for (var j = 0; j < comments.length; j++) {
            var otherComments = document.createElement('table');
            otherComments.className += 'comments-table';
            otherComments.id = 'other-comments';
            otherComments.appendChild(parseComment(comments[j].content, comments[j].score, true));
            var line = document.createElement('hr');
            commentsDiv.appendChild(line);
            commentsDiv.appendChild(otherComments);
        }
        $('#commentsModal').modal('show'); // Reveals the modal.*/
    });
}

/**
 * Adds a comment to the currently opened message. Will only
 * add a new comment if the same text does not already exist.
 */
function addComment() {
    var commentBox = document.getElementById("add-comment");
    if (commentBox.value != "") {
        $.post("get_comment", {
            "content": commentBox.value,
            "lat": currCow.marker.getPosition().lat(),
            "lng": currCow.marker.getPosition().lng(),
        }, function(comment) {
            if (comment.length > 0) {
                return;
            } else {
                $.post("add_comment", {
                    "content": commentBox.value,
                    "score": 0,
                    "lat": currCow.marker.getPosition().lat(),
                    "lng": currCow.marker.getPosition().lng(),
                });
                commentBox.value = "";
                loadComments(currCow.marker);
            }
        });
    }
}

//Only deletes the message if the user created it before reloading the page
function deleteMessage() {
    if (currCow.marker != null && currCow.marker.created == true) {
        $.post("delete_box", {
            "lat": currCow.marker.position.lat(),
            "lng": currCow.marker.position.lng(),
        });
        $.post("delete_marker", {
            "lat": currCow.marker.position.lat(),
            "lng": currCow.marker.position.lng(),
        });
        if (currCow.marker != null) {
            currCow.marker.setMap(null);
        }
        markerCluster.removeMarker(currCow.marker);
        currCow.marker = null
    } else {
        // Print an error for the user.
        if ($("#guide-footer").hasClass('active') == false) {
            $("#guide-footer").addClass('active');
        }
        $("#guide-text").css('color', 'rgba(209, 44, 29, 1)');
        $("#guide-text").text('You can only delete your own cow!');

        window.setTimeout(function() {
            $("#guide-footer").removeClass('active');
        }, 3000);
    }
}

function addUpvote(event) {
    var count = parseInt($("~ .count", this).text()) + 1;
    var content = $(this).parent().closest("div").find('.count').get(0).id;
    var type = $(this).parent().closest("div").find('.count').get(0).value;

    $("~ .count", this).text(count);
    updateScore();

    $(this).parent().addClass("bump");
    setTimeout(function() {
        $(this).parent().removeClass("bump");
    }, 400);
}

function addDownvote(event) {
    var count = parseInt($("~ .count", this).text()) - 1;
    var content = $(this).parent().closest("div").find('.count').get(0).id;
    var type = $(this).parent().closest("div").find('.count').get(0).value;

    $("~ .count", this).text(count);

    $(this).parent().addClass("bump");
    setTimeout(function() {
        $(this).parent().removeClass("bump");
    }, 400);
}

function updateScore(latitude, longitude, content, score, type) {
    $.post("updateScore", {
        lat: latitude,
        lng: longitude,
        content: content,
        score: score,
        type: type
    });
}

/**
 * Whenever the window exits, disable the geolocation tracking.
 */
window.onbeforeunload = function() {
    navigator.geolocation.clearWatch(watchID);
}
