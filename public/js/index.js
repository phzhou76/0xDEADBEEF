/******************************* GLOBALS START ********************************/

var googleMapObject; // The Google Maps Object.
var watchID; // Used to disable continuous tracking of user's location.
var dropMode; // True if the user is trying to drop a cow.

var user = { // Holds marker marking current position and nearby area.
    center: null,
    radius: null
};

var currCow = { // Holds contents of currently expanded message.
    infoBox: null,
    previewBox: null,
    marker: null
};

var zoomImages = []; // Holds different image sizes for different zoom amounts.

var cowBtnText; // Used to modify the drop cow button text.
var deleteContainer; // Used to modify the location of the delete message button.

var lastLocation; // Location of the last click before drop was clicked.

var markerCluster; // Used to store markers for clustering.

var locationMap = []; // Mapping of location to markers and their info boxes.

var filterTypes = [ // Types of filters. Can be added to later.
    "Food",
    "Event",
    "Sales"
];

/******************************* GLOBALS END **********************************/


/**************************** INIT FUNCTIONS START ****************************/

/**
 * Initializes the Google Map and geolocation settings.
 */
function initMap() {
    // Infobox.js relies on Google Maps API, dynamically load script.
    var infoBoxScript = document.createElement('script');
    infoBoxScript.type = 'text/javascript';
    infoBoxScript.src = 'js/infobox.js';
    $('body').append(infoBoxScript);

    dropMode = false;
    $("#map-loading").fadeOut();
    googleMapObject = new google.maps.Map(document.getElementById('map'), {
        zoom: 17,
        mapTypeControl: false,
        streetViewControl: false
    });

    // If geolocation services do not exist, this app should not do anything.
    if (navigator.geolocation) {
        initZoomImages();
        initUserMarker();
        initGeoPosition();

        initDropButton();
        initDeleteButton();
        initOptionsButton();
        initTypeFilters();

        initMarkers();
        initMapListeners();
        initModalListeners();

        markerCluster = new MarkerClusterer(googleMapObject, null, {
            imagePath: '/img/m'
        });
    }
}

/**
 * Initializes the zoom images, which are used to change the size of the user's
 * marker to ensure greater visual accuracy.
 */
function initZoomImages() {
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
}

/**
 * Continuously tracks the user's location, and sets the map's current center
 * to the user's current location. Also initializes the markers required to
 * allow the user to see their location.
 */
function initGeoPosition() {
    // watchID can be used to disable continuous geolocation tracking.
    watchID = navigator.geolocation.watchPosition(function(position) {
        // Set the center of the map to the user's location.
        var currPosition = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
        };
        googleMapObject.setCenter(currPosition);
        user.center.setPosition(currPosition);
    });
}

/**
 * Inits marker and drop radius circle for the user.
 */
function initUserMarker() {
    // Create a marker for the map center.
    user.center = new google.maps.Marker({
        icon: zoomImages[1],
        map: googleMapObject
    });

    // Create a marker that constantly surrounds the map center marker.
    user.radius = new google.maps.Circle({
        map: googleMapObject,
        radius: 150,
        fillColor: 'rgba(30, 30, 30, 0.3)',
        strokeWeight: 4,
        strokeColor: 'rgba(45, 252, 142, 0.5)'
    });

    user.radius.bindTo('center', user.center, 'position');
    user.radius.setVisible(false);

    // Set listeners to allow for message drops on the markers.
    google.maps.event.addDomListener(user.center, 'click', userMarkerClickListener);
    google.maps.event.addDomListener(user.radius, 'click', userMarkerClickListener);
}

/**
 * Inits listeners for the map.
 */
function initMapListeners() {
    // Setup the map listener for any changes in zoom.
    google.maps.event.addDomListener(googleMapObject, 'zoom_changed', zoomListener);
    // Setup the map listener for any clicks on the map.
    google.maps.event.addListener(googleMapObject, 'click', mapClickListener);
}

/**
 * Inits the listeners for the modals.
 */
function initModalListeners() {
    // Inits click for the drop message modal.
    $('#drop').click(messageDropListener);
    // Inits click for the view comments modal.
    $('#add').click(addComment);
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
    google.maps.event.addDomListener(cowBtnContainer, 'click', dropTextListener);
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
    google.maps.event.addDomListener(deleteContainer, 'click', function(event) {
        return deleteMessage();
    });
}

/**
 * Creates a custom map button that shows various options (like filtering).
 */
function initOptionsButton() {
    // Create a div that holds the options button.
    var optionsContainer = document.createElement('div');
    optionsContainer.style.padding = "10px 10px 0px 0px";
    optionsContainer.className = "options";

    // Set the CSS for the button's border.
    var optionsBorder = document.createElement('div');
    optionsBorder.style.backgroundColor = 'rgba(43, 132, 237, 1.0)';
    optionsBorder.style.cursor = 'pointer';
    optionsBorder.style.textAlign = 'center';
    optionsBorder.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.3)';
    optionsContainer.appendChild(optionsBorder);

    // Set the CSS for the button's interior content.
    var optionsImg = document.createElement('img');
    optionsImg.setAttribute('src', 'img/options.png');
    optionsBorder.appendChild(optionsImg);

    // Inserts the finished button to the right-bottom area of the map.
    googleMapObject.controls[google.maps.ControlPosition.TOP_RIGHT].push(optionsContainer);

    // Setup the map listener for the button.
    google.maps.event.addDomListener(optionsContainer, 'click', function(event) {
        return showOptions();
    });

    // Setup type filter button for clicks.
    $("#types-button").click(function() {
        if ($("#types-filter").hasClass("active")) {
            $("#types-filter").removeClass("active");
        } else {
            $("#types-filter").addClass("active");
        }
    });
}

/**
 * Inits the type filter buttons.
 */
function initTypeFilters() {
    for (var i = 0; i < filterTypes.length; ++i) {
        var filterContainer = document.createElement('div');
        filterContainer.style.padding = "0px 16px 0px 10px";

        var filterBorder = document.createElement('label');
        filterBorder.className = 'switch';
        filterBorder.style.cursor = 'pointer';
        filterContainer.append(filterBorder);

        filterText = document.createElement('div');
        filterText.style.color = '#fff';
        filterText.style.fontFamily = 'Arial,sans-serif';
        filterText.style.fontSize = '16px';
        filterText.style.lineHeight = '38px';
        filterText.style.paddingLeft = '17px';
        filterText.style.paddingRight = '17px';
        filterText.innerHTML = filterTypes[i];
        filterBorder.before(filterText);

        var inputBorder = document.createElement('input');
        inputBorder.className = 'switch';
        inputBorder.type = 'checkbox';
        inputBorder.checked = true;

        var inputType = document.createAttribute("data-type");
        inputType.value = filterTypes[i];
        console.log(inputType.value);
        inputBorder.setAttributeNode(inputType);

        filterBorder.append(inputBorder);

        var slider = document.createElement('div');
        slider.className = 'slider round';
        filterBorder.append(slider);

        $("#types-filter").append(filterContainer);

        inputBorder.addEventListener("click", function() {
            toggleType(this.getAttribute("data-type"), this.checked);
        });
    }
}

/**
 * Load initial markers from the database.
 */
function initMarkers() {
    $.get("getMarkers", function(markers) {
        for (var i = 0; i < markers.length; i++) {
            initMarkersHelper(markers[i]);
        }
    });
}

/**
 * Create a marker, given the marker data from the database.
 * @param {Object} markerData - The data of the individual marker.
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

    $.post("getComment", {
        index: 0,
        lat: markerData.lat,
        lng: markerData.lng
    }, function(comment) {
        var infoBox = createInfoBox(markerData.topic, comment[0].content, comment[0].score);
        var previewBox = createPreviewBox(markerData.topic);
        initMarkerListener(marker, infoBox, previewBox);
        storeSortingInfo(markerData.lat, markerData.lng, marker, infoBox, previewBox);
        disableDrop();

        markerCluster.addMarker(marker, true);

        // Attach both info boxes to the marker.
        infoBox.open(googleMapObject, marker);
        previewBox.open(googleMapObject, marker);

        shrinkMessage(infoBox, previewBox);
    });
}

/**
 * Inits event listeners for the marker.
 * @param {Object} marker - The marker that the listener will be attached to.
 * @param {Object} infoBox - The info box attached to the marker that displays the
 *      the full message.
 * @param {Object} previewBox - The info box attached to the marker that displays
 *      only the topic.
 */
function initMarkerListener(marker, infoBox, previewBox) {
    // Create bounce animation when moving over cow marker.
    marker.addListener('mouseover', function(event) {
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
    marker.addListener('click', function(event) {
        enlargeMessage(this, infoBox, previewBox);
    });
}

/**************************** INIT FUNCTIONS END ******************************/


/************************** UI/UX FUNCTIONS START *****************************/

/**
 * Enables the message drop mode.
 */
function enableDrop() {
    cowBtnText.innerHTML = "Cancel";
    dropMode = true;

    // Only let the radius appear if the user is dropping a message.
    user.radius.setVisible(true);
    googleMapObject.panTo(user.center.position);
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
    user.radius.setVisible(false);
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
 * @param {Object} location - Contains latitude and longtitude coordinates.
 * @param {string} topic - Contains the topic for the message.
 * @param {string} comments - Contains the comments for the message.
 * @param {Object} type - Contains the type of the message.
 */
function addCowPin(location, topic, comments, type) {
    var picture = {
        url: chooseImage(type),
        size: new google.maps.Size(50, 50),
        scaledSize: new google.maps.Size(50, 50)
    };

    var currDate = new Date();

    // Post marker info to route to save to database.
    var markerInfo = {
        topic: topic,
        type: type,
        numComments: 0,
        lat: location.lat(),
        lng: location.lng(),
        date: currDate
    };
    $.post("addMarker", markerInfo);

    // Post comment info to route to save to database.
    var commentInfo = {
        content: comments,
        score: 0,
        index: 0,
        numComments: 1,
        lat: location.lat(),
        lng: location.lng(),
        date: currDate
    };
    $.post("addComment", commentInfo);

    var marker = new google.maps.Marker({
        position: location,
        map: googleMapObject,
        icon: picture,
        animation: google.maps.Animation.DROP,
    });
    markerCluster.addMarker(marker, true);

    var infoBox = createInfoBox(topic, comments, 0);
    var previewBox = createPreviewBox(topic);

    initMarkerListener(marker, infoBox, previewBox);
    storeSortingInfo(location.lat(), location.lng(), marker, infoBox, previewBox);
    enlargeMessage(marker, infoBox, previewBox);
    disableDrop();

    // Attach both info and preview boxes to the marker.
    window.setTimeout(function() {
        infoBox.open(googleMapObject, marker);
    }, 600);
    previewBox.open(googleMapObject, marker);
}

/**
 * Given the location of a marker, the message attached to that marker will
 * shrink down to the topic-only message.
 * @param {Object} infoBox - The expanded info box of the message.
 * @param {Object} previewBox - The shrunk down preview box of the message.
 */
function shrinkMessage(infoBox, previewBox) {
    setInfoBoxVisibility(infoBox, false, true);
    setInfoBoxVisibility(previewBox, true, false);
}

/**
 * Given the location of a marker, the message attached to that marker will
 * expand to the full message.
 * @param {Object} marker - The marker that was clicked on to enlarge its message.
 * @param {Object} infoBox - The info box Object that will be expanded.
 * @param {Object} previewBox - The info box Object that will disappear.
 */
function enlargeMessage(marker, infoBox, previewBox) {
    // Shrink the contents of the previously opened message, if available.
    if (currCow.infoBox != null && currCow.previewBox != null && currCow.marker != null) {
        shrinkMessage(currCow.infoBox, currCow.previewBox);
    }

    currCow = {
        infoBox: infoBox,
        previewBox: previewBox,
        marker: marker
    };

    setInfoBoxVisibility(infoBox, true, true);
    setInfoBoxVisibility(previewBox, false, false);

    googleMapObject.panTo({
        lat: marker.getPosition().lat(),
        lng: marker.getPosition().lng()
    });
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

    $.post("getMarker", {
        lat: currCow.marker.getPosition().lat(),
        lng: currCow.marker.getPosition().lng()
    }, function(markerData) {
        // Replace previous topic with this message's topic.
        var topicHeader = document.getElementById("topic-header");
        if (topicHeader != null) {
            topicHeader.innerHTML = markerData[0].topic;
        }

        $.post("getComments", {
            lat: currCow.marker.position.lat(),
            lng: currCow.marker.position.lng(),
        }, function(comments) {
            commentsDiv.appendChild(createMainComment(comments[0]));

            if (comments.length > 1) {
                commentsDiv.appendChild(document.createElement('hr'));
                commentsDiv.appendChild(createOtherComments(comments));
            }
        });

        $('#commentsModal').modal('show'); // Reveals the modal.
    });
}

/**
 * Reveals the options menu.
 */
function showOptions() {
    if ($("#options-sidebar").hasClass("active")) {
        $("#options-sidebar").removeClass("active");
    } else {
        $("#options-sidebar").addClass("active");
    }
}

/**
 * Toggles the visibility of a certain type of cow message.
 * @param {string} type - The category that the message falls under.
 * @param {bool} visible - True if the visiblity should be on.
 */
function toggleType(type, visible) {
    // Obtain list of all markers of this type.
    $.post("getMarkersByType", {
        type: type
    }, function(markers) {
        for(var i = 0; i < markers.length; ++i) {
            var locString = locToString(markers[i].lat, markers[i].lng);
            locationMap[locString].marker.setMap((visible) ? googleMapObject : null);
            setInfoBoxVisibility(locationMap[locString].infoBox, false, true);
            setInfoBoxVisibility(locationMap[locString].previewBox, visible, false);
        }
    });
}

/*************************** UI/UX FUNCTIONS END ******************************/


/************************** DATABASE FUNCTIONS START **************************/

/**
 * Adds a comment to the currently opened message. Will only
 * add a new comment if the same text does not already exist.
 */
function addComment() {
    var commentBox = document.getElementById("add-comment");
    if (commentBox.value != "") {
        // Need to grab the total number of comments, and update it.
        $.post("getMarker", {
            lat: currCow.marker.getPosition().lat(),
            lng: currCow.marker.getPosition().lng()
        }, function(marker) {
            $.post("addComment", {
                content: commentBox.value,
                score: 0,
                index: marker[0].numComments,
                numComments: (marker[0].numComments + 1),
                lat: currCow.marker.getPosition().lat(),
                lng: currCow.marker.getPosition().lng(),
                date: new Date()
            });

            commentBox.value = "";
            loadComments();
        });
    }
}

/**
 * Allows the user to delete a message only if the user has created it.
 * TODO: Need to implement a way to detect a returning user.
 */
function deleteMessage() {
    if (currCow.infoBox != null && currCow.previewBox != null && currCow.marker != null) {
        $.post("deleteMarker", {
            lat: currCow.marker.position.lat(),
            lng: currCow.marker.position.lng()
        });

        if (currCow.marker != null) {
            currCow.marker.setMap(null);
        }

        markerCluster.removeMarker(currCow.marker);
        currCow.infoBox = currCow.previewBox = currCow.marker = null;
    }
}

/**
 * Updates the database with the updated score.
 * @param {number} latitude - The latitude coordinate of the message.
 * @param {number} longitude - The longitude coordinate of the message.
 * @param {number} score - The updated score.
 * @param {number} index - The index of the comment.
 */
function updateScore(latitude, longitude, score, index) {
    $.post("updateScore", {
        score: score,
        index: index,
        lat: latitude,
        lng: longitude
    });
}

/************************** DATABASE FUNCTIONS END ****************************/


/************************* CREATION FUNCTIONS START ***************************/

/**
 * Inits the contents of the info box.
 * @param {string} topic - The topic of the message.
 * @param {string} comments - The comment of the message.
 * @param {number} score - The score of the comment.
 * @return {Object} The created info box.
 */
function createInfoBox(topic, comments, score) {
    // Initialize the info box.
    var infoBox = new InfoBox({
        pixelOffset: new google.maps.Size(-150, -225),
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
    commentHTML.appendChild(parseComment(comments, score, 0));

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
 * @return {Object} The created preview box.
 */
function createPreviewBox(topic) {
    // Initialize the preview box.
    var previewBox = new InfoBox({
        pixelOffset: new google.maps.Size(-75, -125),
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
 * Takes in a string, and converts it to a table element for the info window.
 * @param {string} comment - The details of the message.
 * @param {number} score - The score of the comment.
 * @param {number} index - The index of the comment.
 * @return {Object} The DOM Object that contains the message details.
 */
function parseComment(comment, score, index) {
    var tableRow = document.createElement('tr');
    tableRow.className = 'commentRow';

    // Init voting segment.
    var voteHeader = document.createElement('th');
    var voteDiv = document.createElement('div');
    voteDiv.className += 'vote chev';

    var upvoteDiv = document.createElement('div');
    upvoteDiv.className += 'increment up';
    upvoteDiv.addEventListener('click', addUpvoteListener);

    var downvoteDiv = document.createElement('div');
    downvoteDiv.className += 'increment down';
    downvoteDiv.addEventListener('click', addDownvoteListener);

    var countDiv = document.createElement('div');
    countDiv.className += 'count';
    countDiv.innerHTML = score;

    // Init comment segment.
    var commentHeader = document.createElement('th');
    var commentDiv = document.createElement('div');
    commentDiv.className += 'comment';
    commentDiv.innerHTML = comment;

    var commentIndex = document.createAttribute("data-index");
    commentIndex.value = index;
    commentDiv.setAttributeNode(commentIndex);

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
 * Creates a table that only contains the main comment.
 * @param {Object} comment - Main comment object.
 * @return {Object} The table element containing the main comment.
 */
function createMainComment(comment) {
    // First create a table for the main comment.
    var mainComment = document.createElement('table');
    mainComment.className = 'comments-table';
    mainComment.id = 'main-comment';
    mainComment.appendChild(parseComment(comment.content,
        comment.score, comment.index));

    return mainComment;
}

/**
 * Creates a table that contains the rest of the comments for the comment modal.
 * @param {Object} comments - List of comment objects. Must be a length greater
 *      than one.
 * @return {Object} The table element containing the rest of the comments.
 */
function createOtherComments(comments) {
    var otherComments = document.createElement('table');
    otherComments.className = 'comments-table';
    otherComments.id = 'other-comments';

    for (var j = 1; j < comments.length; j++) {
        otherComments.appendChild(parseComment(comments[j].content,
            comments[j].score, comments[j].index));
    }

    return otherComments;
}

/************************** CREATION FUNCTIONS END ****************************/


/************************* LISTENER FUNCTIONS START ***************************/

/**
 * Listener function for zoom_changed event.
 */
function zoomListener(event) {
    // Adjust size of position icon depending on zoom.
    if (googleMapObject.getZoom() < 17) {
        user.center.setIcon(zoomImages[0]);
    } else if (googleMapObject.getZoom() >= 17 && googleMapObject.getZoom() < 20) {
        user.center.setIcon(zoomImages[1]);
    } else {
        user.center.setIcon(zoomImages[2]);
    }

    if (dropMode) {
        if ($("#guide-footer").hasClass('active') == false) {
            $("#guide-footer").addClass('active');
        }
        if (googleMapObject.getZoom() < 17) {
            user.radius.setVisible(false);
            $("#guide-text").text("Too far zoomed out!");
            $("#guide-text").css('color', 'rgba(209, 44, 29, 1)');
        } else {
            user.radius.setVisible(true);
            $("#guide-text").text("Drop a cow within the gray area.");
            $("#guide-text").css('color', 'rgba(43, 132, 237, 1)');
        }
    }
}

/**
 * Listener function for the map click event.
 */
function mapClickListener(event) {
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
}

/**
 * Listener function for the user marker and radius circle click event.
 */
function userMarkerClickListener(event) {
    lastLocation = event.latLng;
    return dropClick();
}

/**
 * Modifies the text of the message drop button, as well as the guide text.
 */
function dropTextListener(event) {
    if (!dropMode) {
        enableDrop();
    } else {
        disableDrop();
    }
}

/**
 * Listener function for the message drop modal.
 */
function messageDropListener(event) {
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
}

/**
 * Adds 1 to a score count of a message.
 * TODO: Need to implement users, so that a single upvote is allowed at any time.
 */
function addUpvoteListener(event) {
    var score = parseInt($("~ .count", this).text()) + 1;
    var index = $(this).closest(".commentRow").find(".comment").get(0).getAttribute("data-index");

    $("~ .count", this).text(score);
    updateScore(currCow.marker.getPosition().lat(), currCow.marker.getPosition().lng(),
        score, index);

    $(this).parent().addClass("bump");
    setTimeout(function() {
        $(this).parent().removeClass("bump");
    }, 400);
}

/**
 * Subtracts 1 from the score count of a message.
 * TODO: Need to implement users, so that a single downvote is allowed at any time.
 */
function addDownvoteListener(event) {
    var score = parseInt($("~ .count", this).text()) - 1;
    var index = $(this).closest(".commentRow").find(".comment").get(0).getAttribute("data-index");

    $("~ .count", this).text(score);
    updateScore(currCow.marker.getPosition().lat(), currCow.marker.getPosition().lng(),
        score, index);

    $(this).parent().addClass("bump");
    setTimeout(function() {
        $(this).parent().removeClass("bump");
    }, 400);
}

/************************** LISTENER FUNCTIONS END ****************************/


/*************************** MISC FUNCTIONS START *****************************/

/**
 * Given a latitude and longitude (in float), will create a space-separated
 * string that has their values.
 * @param {float} latitude - The latitude of the location.
 * @param {float} longitude - The longitude of the location.
 * @return {string} The string representation of the latitude-longitude coords.
 */
function locToString(latitude, longitude) {
    return parseFloat(latitude) + " " + parseFloat(longitude);
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
 * Sets the visibility of an info box. Can be used for preview boxes too.
 * @param {Object} infoBox - The info box to set the opacity of.
 * @param {bool} visible - True if visibility desired, false otherwise.
 * @param {bool} isInfoBox - True if info box, false if preview box.
 */
function setInfoBoxVisibility(infoBox, visible, isInfoBox) {
    infoBox.setOptions({
        boxStyle: {
            borderRadius: "10px",
            border: (isInfoBox) ? "6px solid rgba(43, 132, 237, 1.0)" : "6px solid rgba(43, 132, 237, 0.5)",
            textAlign: "center",
            fontSize: "12pt",
            width: (isInfoBox) ? "300px" : "150px",
            display: (visible) ? "block" : "none",
            backgroundColor: "rgba(255, 255, 255, 1.0)"
        }
    });
}

/**
 * Stores the type, score, and date created of a marker into a table for filter purposes.
 * @param {number} latitude - The latitude of the marker.
 * @param {number} longitude - The longitude of the marker.
 * @param {Object} marker - The marker of this message.
 * @param {Object} infoBox - The info box of this message.
 * @param {Object} previewBox - The preview box of this message.
 */
function storeSortingInfo(latitude, longitude, marker, infoBox, previewBox) {
    // Location will be used as the key.
    var locString = locToString(latitude, longitude);
    locationMap[locString] = {
        marker: marker,
        infoBox: infoBox,
        previewBox: previewBox
    };
}

/**
 * Whenever the window exits, disable the geolocation tracking.
 */
window.onbeforeunload = function() {
    navigator.geolocation.clearWatch(watchID);
}

/**************************** MISC FUNCTIONS END ******************************/
