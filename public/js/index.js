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

var username;
var password;
var commentNode;

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
    googleMapObject.controls[google.maps.ControlPosition.LEFT_CENTER].push(cowBtnContainer);

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
    deleteContainer.style.padding = "0px 0px 0px 0px";
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
        //console.log(inputType.value);
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
        size: new google.maps.Size(65, 65),
        scaledSize: new google.maps.Size(65, 65),
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
        var infoBox = createInfoBox(markerData.topic, comment[0].content, comment[0].score, comment[0]._id);
        var previewBox = createPreviewBox(markerData.topic);
        initMarkerListener(marker, infoBox, previewBox);
        storeSortingInfo(markerData.lat, markerData.lng, marker, infoBox, previewBox);
        disableDrop();

        markerCluster.addMarker(marker, true);

        // Attach both info boxes to the marker.
        infoBox.open(googleMapObject, marker);
        //previewBox.open(googleMapObject, marker);

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
        previewBox.open(googleMapObject, marker);
        setTimeout(function() {
                previewBox.close();
            }, 2000);
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

//function for css fade in after init page and functions load
$(function() {
    $('body').removeClass('fade-out');
});

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
        size: new google.maps.Size(60, 60),
        scaledSize: new google.maps.Size(60, 60)
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
    //previewBox.open(googleMapObject, marker);
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
        if ($("#types-filter").hasClass("active")) {
            $("#types-filter").removeClass("active");
        }
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
            //only close preview box not set visi to true since previewbox is now display on hover.
            locationMap[locString].previewBox.close();
            //setInfoBoxVisibility(locationMap[locString].previewBox, visible, false);
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
 function createInfoBox(topic, comments, score, commentID) {
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
    commentHTML.appendChild(parseComment(comments, score, 0, commentID));

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
 * @param {string} commentID - The id of the comment
 * @return {Object} The DOM Object that contains the message details.
 */
 function parseComment(comment, score, index, commentID) {
    var commentNode;
    jQuery.ajax({
        url: 'getVote',
        type: 'POST',
        data: {username: username, commentID: commentID },
        success: function(vote) {
            var tableRow = document.createElement('tr');
            tableRow.className = 'commentRow';

            // Init voting segment.
            var voteHeader = document.createElement('th');
            var voteDiv = document.createElement('div');
            voteDiv.className += 'vote chev';

            var upvoteDiv = document.createElement('div');

            //Lets user know if they have already voted
            if(vote[0] && vote[0].score == 1) {
                upvoteDiv.className += 'increment up active'
            }
            else {
              upvoteDiv.className += 'increment up';
          }
          upvoteDiv.addEventListener('click', addUpvoteListener);

          var downvoteDiv = document.createElement('div');

          if(vote[0] && vote[0].score == -1) {
            downvoteDiv.className += 'increment down active';
        }
        else {
            downvoteDiv.className += 'increment down';
        }
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
            commentNode = tableRow;

        }, 
        async: false
    })

    return commentNode;
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
        comment.score, comment.index, comment._id));

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
            comments[j].score, comments[j].index, comments[j]._id));
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
 */
 function addUpvoteListener(event) {
    var thisButton = this;
    var increment_down = $(thisButton).parent().closest("div").find(".increment.down")[0]
    var increment_up = $(thisButton).parent().closest("div").find(".increment.up")[0]
    var score = parseInt($("~ .count", this).text()) + 1;
    var index = $(this).closest(".commentRow").find(".comment").get(0).getAttribute("data-index");

    //Only upvotes if user is logged in
    if(username) {
      $.post("getComment", {
        index: index,
        lat: currCow.marker.getPosition().lat(),
        lng: currCow.marker.getPosition().lng(),
    }, function(comment) {

        //Get vote using commentID and username
        $.post("getVote", {
            commentID: comment[0]._id,
            username: username,
        }, function(vote) {
            //If vote doesn't exist, post a new vote
            if(!vote[0]) {
                $.post("addVote", {
                    commentID: comment[0]._id,
                    username: username,
                    score: 1
                });
                //Update comment score and html
                $("~ .count", thisButton).text(score);
                updateScore(currCow.marker.getPosition().lat(), currCow.marker.getPosition().lng(),
                    score, index); 
                $(thisButton).addClass("active")

            }
            //Change vote to +1 of what it was before if not already at 1 (upvoted)
            else {
                if(vote[0].score != 1) {
                  $.post("updateVote", {
                    commentID: comment[0]._id,
                    username: username,
                    score: vote[0].score + 1
                })
                  $("~ .count", thisButton).text(score);
                  updateScore(currCow.marker.getPosition().lat(), currCow.marker.getPosition().lng(),
                     score, index); 

                   //From vote score -1 to 0:
                   if(vote[0].score == - 1) {
                      $(increment_down).removeClass('active')
                  }
                   //From vote score 0 to 1
                   else {
                      $(increment_up).addClass('active')
                  }
              }
          }
      })
    });

  }

   //If not logged in, tells user to login and opens login page
   else {
      if ($("#guide-footer").hasClass('active') == false) {
        $("#guide-footer").addClass('active');
        setTimeout(function() {
          $("#guide-footer").removeClass("active");
      }, 1500);
    }
    $("#guide-text").text('Please login to vote');
    $("#guide-text").css('color', 'rgba(209, 44, 29, 1)');
    $("#login-modal").modal('show')
}

$(this).parent().addClass("bump");
setTimeout(function() {
    $(this).parent().removeClass("bump");
}, 400);
}

/**
 * Subtracts 1 from the score count of a message.
 */
 function addDownvoteListener(event) {
    var thisButton = this;
    var score = parseInt($("~ .count", this).text()) - 1;
    var increment_down = $(thisButton).parent().closest("div").find(".increment.down")[0]
    var increment_up = $(thisButton).parent().closest("div").find(".increment.up")[0]
    var index = $(this).closest(".commentRow").find(".comment").get(0).getAttribute("data-index");

    if(username) {
      $.post("getComment", {
        index: index,
        lat: currCow.marker.getPosition().lat(),
        lng: currCow.marker.getPosition().lng(),
    }, function(comment) {

        //Get vote using commentID and username
        $.post("getVote", {
            commentID: comment[0]._id,
            username: username,
        }, function(vote) {
            //If vote doesn't exist, post a new vote with score of -1
            if(!vote[0]) {
                $.post("addVote", {
                    commentID: comment[0]._id,
                    username: username,
                    score: -1
                });
                //Update comment score and html
                $("~ .count", thisButton).text(score);
                updateScore(currCow.marker.getPosition().lat(), currCow.marker.getPosition().lng(),
                    score, index);
                $(increment_down).addClass('active') 
            }
            //Change vote to -1 of what it was before if not already at -1 (downvoted)
            else {
                if(vote[0].score != -1) {
                  $.post("updateVote", {
                    commentID: comment[0]._id,
                    username: username,
                    score: vote[0].score - 1
                });
                  $("~ .count", thisButton).text(score);
                  updateScore(currCow.marker.getPosition().lat(), currCow.marker.getPosition().lng(),
                     score, index); 

                   //From 1 to 0
                   if(vote[0].score == 1) {
                      $(increment_up).removeClass('active')
                  }

                   //From 0 to -1
                   else {
                      $(increment_down).addClass('active')
                  }
              }
          }
      })
    });
  } 

   //If not logged in, tells user to login and opens login page
   else {
      if ($("#guide-footer").hasClass('active') == false) {
        $("#guide-footer").addClass('active');
        setTimeout(function() {
          $("#guide-footer").removeClass("active");
      }, 1500);
    }
    $("#guide-text").text('Please login to vote');
    $("#guide-text").css('color', 'rgba(209, 44, 29, 1)');
    $("#login-modal").modal('show')
}

$(this).parent().addClass("bump");
setTimeout(function() {
    $(this).parent().removeClass("bump");
}, 400);
}

/************************** LISTENER FUNCTIONS END ****************************/

/************************** LOGIN FUNCTIONS START *****************************/
   // The "getFormData()" function retrieves the names and values of each input field in the form; 

   function getFormData(form) {
      var data = {};
      $(form).find('input, select').each(function() {
        if (this.tagName.toLowerCase() == 'input') {
          if (this.type.toLowerCase() == 'checkbox') {
            data[this.name] = this.checked;
        } else if (this.type.toLowerCase() != 'submit') {
            data[this.name] = this.value;
        }
    } else {
      data[this.name] = this.value;
  }
});
      return data;
  }

    // The "addFormError()" function, when called, adds the "error" class to the form-group that wraps around the "formRow" attribute;

    function addFormError(formRow, errorMsg) {
      var errorMSG = '<span class="error-msg">' + errorMsg + '</span>';
      $(formRow).parents('.form-group').addClass('has-error');
      $(formRow).parents('.form-group').append(errorMSG);
      $('#dialog').removeClass('dialog-effect-in');
      $('#dialog').addClass('shakeit');
      setTimeout(function() {
        $('#dialog').removeClass('shakeit');
    }, 300);
  }

    // FORM HANDLER:

    // form_name - This attribute ties the form-handler function to the form you want to submit through ajax. Requires an ID (ex: #myfamousid)
    // custom_validation - 

    function form_handler(form_name, custom_validation, success_message, error_message, success_function, error_function) {
      $(form_name).find('input[type="submit"]').on('click', function(e) { // if submit button is clicked

        window.onbeforeunload = null; // cancels the alert message for unsaved changes (if such function exists)

        $(form_name).find('.form-group .error-msg').remove();
        var submitButton = this;
        submitButton.disabled = true; // Disables the submit buttton until the rows pass validation or we get a response from the server.

        var form = $(form_name)[0];
        // The custom validation function must return true or false.
        if (custom_validation != null) {
          if (!custom_validation(form, getFormData(form))) {
            submitButton.disabled = false;
            return false;
        }
    }
        e.preventDefault(); //STOP default action
    });
      $(document).click(function(e) { // Whenever the user clicks inside the form, the error messages will be removed.
        if ($(e.target).closest(form_name).length) {
          $(form_name).find('.form-group').removeClass('has-error');
          setTimeout(function() {
            $(form_name).find('.form-group .error-msg').remove();
        }, 300);
      } else {
          return
      }
  });
  }

    // LOGIN FORM: Validation function - Sets global username and password 
    function validate_login_form(form, data) {
      if (data.user_username == "") {
        // if username variable is empty
        addFormError(form["user_username"], 'The username is invalid');
        return false; // stop the script if validation is triggered
    }

    if (data.user_password == "") {
        // if password variable is empty
        addFormError(form["user_password"], 'The password is invalid');
        return false; // stop the script if validation is triggered
    }

      //Attempt login.  If successful, change login text to username, hides modal, and reinits markers
      $.post("login", {
        username: data.user_username,
        password: data.user_password
      }, function(user) { 
         if(user[0] != null ) {
            username = data.user_username;
            password = data.user_password;
            $('#successful_login').removeClass('active');
            dialogBox.removeClass('dialog-effect-out').addClass('dialog-effect-in');
            document.getElementById('login_form').reset();
            $('#login-modal').modal('hide');
            $('#loginButton').text(username)
            markerCluster.clearMarkers()
            initMarkers();
        }
        else {
            addFormError(form["user_username"], 'The username or password is incorrect');
        }
    });

    // REGISTRATION FORM: Validation function
    function validate_registration_form(form, data) {
      if (data.user_username == "") {
        // if username variable is empty
        addFormError(form["user_username"], 'The username is invalid');
        return false; // stop the script if validation is triggered
    }

    if (data.user_password == "") {
        // if password variable is empty
        addFormError(form["user_password"], 'The password is invalid');
        return false; // stop the script if validation is triggered
    }

    if (data.user_cnf_password == "" || data.user_password != data.user_cnf_password) {
        // if password variable is empty
        addFormError(form["user_cnf_password"], "The passwords don't match");
        return false; // stop the script if validation is triggered
    }

      //Creates user unless user already exists
      $.post("getUser", {
        username: data.user_username,
        password: data.user_password
    }, function(user) {   
        if(user[0] != null ) {
            addFormError(form["user_username"], 'The username already exists');
        }
        else {
          $.post("addUser", {
            username: data.user_username,
            password: data.user_password
        });
          $('#successful_login,#successful_registration').removeClass('active');
          document.getElementById('register_form').reset();
          $('#login-modal').modal('hide');
          dialogBox.removeClass('dialog-effect-out').addClass('dialog-effect-in');
      }
  });
      
     // $('#dialog').removeClass('dialog-effect-in').removeClass('shakeit');
     // $('#dialog').addClass('dialog-effect-out');
     $('#successful_registration').addClass('active');

      //return true;
  }

  form_handler("#login_form", validate_login_form, null, null, null, null, null, null);
  form_handler("#register_form", validate_registration_form, null, null, null, null, null, null);

  var dialogBox = $('#dialog');

  dialogBox.on('click', 'a.user-actions', function() {
      dialogBox.toggleClass('flip');
  });

  $( "#submit_login" ).click(function() {
    //$('#successful_login,#successful_registration').removeClass('active');
  /*    if ($('#successful_login').hasClass('active')) {
       $('#successful_login').removeClass('active');
        dialogBox.removeClass('dialog-effect-out').addClass('dialog-effect-in');
        document.getElementById('login_form').reset();
        $('#login-modal').modal('hide');
    };*/
});

  $("#submit_registration" ).click(function() {
    /*  if ($('#successful_registration').hasClass('active')) {
         $('#successful_login,#successful_registration').removeClass('active');
         document.getElementById('register_form').reset();
         $('#login-modal').modal('hide');
         dialogBox.removeClass('dialog-effect-out').addClass('dialog-effect-in');
     }  */
 });

  /*************************** LOGIN FUNCTIONS END *****************************/


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

function Tutorial(){
    swal.setDefaults({
      confirmButtonText: 'Next &rarr;',
      showCancelButton: true,
      animation: true,
      progressSteps: ['1', '2', '3', '4', '5', '6']
  })

    var steps = [
    {
        title: 'Welcome to Deja Moo!',
        text: 'Deja Moo allows you to view cows in your surrounding areas to find ' + 
        'events, food, and sales!',
        imageUrl: 'img/cow.png',
        imageWidth: '200px',
        imageHeight: '200px'
    },
    {
        title: 'Dropping a Cow',
        text: 'Dropping a cow lets you place a cow pin near your current location. Click on the "Drop a Cow!" button and enter ' +
        'the topic, comment, and cow type to begin.',
        imageUrl: 'img/tut2.png',
        imageWidth: '400px',
        imageHeight: '375px',
        animation: false
    },
    {
        title: 'Deleting a Cow',
        text: 'Click on your own cow and click the delete button to delete a cow.  You can ' +
        'only delete a cow you have dropped before refreshing the page.',
        imageUrl: 'img/tut3.png',
        imageWidth: '520px',
        imageHeight: '300px',
        animation: false
    },
    {
        title: 'Viewing Other Cows',
        text: 'Click on a cow on the map to see the main comment!  Click view comments to view' +
        ' all of the comments.',
        imageUrl: 'img/tut4.png',
        imageWidth: '400px',
        imageHeight: '250px',
        animation: false
    },
    {
        title: 'Voting Comments',
        text: 'Click on the green arrow to upvote and the red arrow to downvote comments!',
        imageUrl: 'img/tut5.png',
        imageWidth: '350px',
        imageHeight: '250px',
        animation: false
    },
    {
        title: 'Filtering Cows',
        text: 'Click on the "Filter Cows" button and select which types of cows you would like to see!',
        imageUrl: 'img/tut6.png',
        imageWidth: '600px',
        imageHeight: '275px',
        animation: false
    },
    ]

    swal.queue(steps).then(function (result) {
      swal.resetDefaults()
      swal({
        title: 'All done!',
        confirmButtonText: 'Ready to Deja Moo',
        showCancelButton: false
    })
  }, function () {
      swal.resetDefaults()
  })
}

/**************************** MISC FUNCTIONS END ******************************/
