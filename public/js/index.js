var map;
var dropMode; // True if the user is trying to drop a cow.
var watchID; // Used to disable continuous tracking of user's location.
var markerID;
var filterMode;


var centerMarker; // Need to store to affect visibility later on.
var radiusMarker;
var cowBtnText;
var deleteContainer;
var filterContainer;
var cowBtnContainer;
var CheckContainer;
var CheckContainer2;
var CheckContainer3;

var currInfo;
var currPreview;

var currentCow; // Location of cow whose message is currently expanded.
var infoMap = new Object(); // Mapping of lat-lng (string) to message info.
var objectMap = new Object(); // Mapping of lat-lng (string) to marker and infobox.
var zoomImages = [];
var lastLocation; // Location of the last click before drop was clicked.
var marker_list = [];       


/**
 * Initializes the Google Map and geolocation settings.
 */
function initMap() {
    dropMode = false;
    filterMode = false;
    $("#map-loading").fadeOut();
    map = new google.maps.Map(document.getElementById('map'), {
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
        initMapButtons();
        initMapListeners();
        initModalListeners();

         markerCluster = new MarkerClusterer(map, marker_list,      
            {imagePath: 'img/m'});
    }
}

/**
 * Continuously tracks the user's location, and sets the map's current center
 * to the user's current location. Also initializes the markers required to
 * allow the user to see their location.
 */
function getGeoPosition() {
    // Create a marker for the map center.
    centerMarker = new google.maps.Marker({
        icon: zoomImages[1],
        map: map
    });

    // Create a marker that constantly surrounds the map center marker.
    radiusMarker = new google.maps.Circle({
        map: map,
        radius: 150,
        fillColor: 'rgba(30, 30, 30, 0.3)',
        strokeWeight: 4,
        strokeColor: 'rgba(45, 252, 142, 0.5)'
    });

    radiusMarker.bindTo('center', centerMarker, 'position');
    radiusMarker.setVisible(false);

    // Set listeners to allow for message drops on the markers.
    google.maps.event.addDomListener(centerMarker, 'click', function(event) {
        lastLocation = event.latLng;
        return dropClick();
    });
    google.maps.event.addDomListener(radiusMarker, 'click', function(event) {
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
        map.setCenter(currPosition);
        centerMarker.setPosition(currPosition);
    });
}

/**
 * Inits listeners for the map.
 */
function initMapListeners() {
    // Setup the map listener for any changes in zoom.
    google.maps.event.addDomListener(map, 'zoom_changed',
        function() {
            // Adjust size of position icon depending on zoom.
            if (map.getZoom() < 17) {
                centerMarker.setIcon(zoomImages[0]);
            } else if (map.getZoom() >= 17 && map.getZoom() < 20) {
                centerMarker.setIcon(zoomImages[1]);
            } else {
                centerMarker.setIcon(zoomImages[2]);
            }

            if (dropMode) {
                if ($("#guide-footer").hasClass('active') == false) {
                    $("#guide-footer").addClass('active');
                }
                if (map.getZoom() < 17) {
                    radiusMarker.setVisible(false);
                    $("#guide-text").text("Too far zoomed out!");
                    $("#guide-text").css('color', 'rgba(209, 44, 29, 1)');
                } else {
                    radiusMarker.setVisible(true);
                    $("#guide-text").text("Drop a cow within the gray area.");
                    $("#guide-text").css('color', 'rgba(43, 132, 237, 1)');
                }
            }
        });

    // Setup the map listener for any clicks on the map.
    google.maps.event.addListener(map, 'click', function(event) {
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
            //console.log("ugh");
            if (currentCow != null) {
                //shrinkMessage2(locToString    (currentCow.getPosition().lat(), currentCow.getPosition().lng()), currInfo, currPreview);
               // currentCow = null;
                //console.log("rip")
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
function initMapButtons() {
    initDropButton();
    initDeleteButton();
    initFilterBox();
    initCheckbox1();
    initCheckbox2();
    initCheckbox3();
    initMarkers();
    CheckContainer.className = "options inactive";
    CheckContainer2.className = "options inactive";
    CheckContainer3.className = "options inactive";
    
}

/**
 * Creates a custom map button to allow toggling of message-dropping
 * functionality.
 */
function initDropButton() {
    // Create a div that holds the cow-dropping button.
    cowBtnContainer = document.createElement('div');

    // Set the CSS for the button's border.
    cowBtnBorder = document.createElement('div');
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
    map.controls[google.maps.ControlPosition.RIGHT_CENTER].push(cowBtnContainer);

    // Setup the map listener for the button.
    google.maps.event.addDomListener(cowBtnContainer, 'click', function() {
        return dropText();
    });
}

function initFilterBox() {
    
    filterContainer = document.createElement('div');
    //filterContainer.style.padding = "10px 0px 0px 0px";

    
   


    var filterBorder = document.createElement('div');
    filterBorder.style.backgroundColor = 'rgba(43, 132, 237, 1.0)';
    filterBorder.style.cursor = 'pointer';
    //filterBorder.style.textAlign = 'center';
    filterBorder.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.3)';
    filterContainer.appendChild(filterBorder);





    filterText = document.createElement('div');
    filterText.style.color = '#fff';
    filterText.style.fontFamily = 'Arial,sans-serif';
    filterText.style.fontSize = '16px';
    filterText.style.lineHeight = '38px';
    filterText.style.paddingLeft = '15px';
    filterText.style.paddingRight = '15px';
    filterText.innerHTML = 'Filter Cows';
    filterBorder.append(filterText);

    

    
    map.controls[google.maps.ControlPosition.RIGHT].push(filterContainer);

    google.maps.event.addDomListener(filterContainer, 'click', function() {
        return filterCows();
    });

   
}

function initCheckbox1(){

    CheckContainer = document.createElement('div');
    CheckContainer.style.padding = "0px 16px 0px 10px";

    var boxBorder = document.createElement('div');
    boxBorder.style.backgroundColor = 'white';
    boxBorder.style.cursor = 'pointer';
    boxBorder.style.textAlign = 'center';
    //boxBorder.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.3)';
    CheckContainer.appendChild(boxBorder);
    

    

    var checkBorder = document.createElement('label');
    checkBorder.className= 'switch';
    checkBorder.style.cursor = 'pointer';
    boxBorder.append(checkBorder);

    checkText = document.createElement('div');
    checkText.style.color =  '#ccc';
    checkText.style.fontFamily = 'Arial,sans-serif';
    checkText.style.fontSize = '16px';
    checkText.style.lineHeight = '38px';
    checkText.style.paddingLeft = '17px';
    checkText.style.paddingRight = '17px';
    checkText.innerHTML = 'Food:';
    checkBorder.before(checkText);

    var border = document.createElement('input');
    border.className= 'switch';
    border.type= 'checkbox';
    checkBorder.append(border);

    var slider = document.createElement('div');
    slider.className= 'slider round';
    checkBorder.append(slider);

  



    map.controls[google.maps.ControlPosition.RIGHT].push(CheckContainer);




}

function initCheckbox2(){

    CheckContainer2 = document.createElement('div');
    CheckContainer2.style.padding = "0px 16px 0px 10px";

    var boxBorder = document.createElement('div');
    boxBorder.style.backgroundColor = 'white';
    boxBorder.style.cursor = 'pointer';
    boxBorder.style.textAlign = 'center';
    //boxBorder.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.3)';
    CheckContainer2.appendChild(boxBorder);
    

    

    var checkBorder = document.createElement('label');
    checkBorder.className= 'switch';
    checkBorder.style.cursor = 'pointer';
    boxBorder.append(checkBorder);

    checkText = document.createElement('div');
    checkText.style.color =  '#ccc';
    checkText.style.fontFamily = 'Arial,sans-serif';
    checkText.style.fontSize = '16px';
    checkText.style.lineHeight = '38px';
    checkText.style.paddingLeft = '15px';
    checkText.style.paddingRight = '15px';
    checkText.innerHTML = 'Event:';
    checkBorder.before(checkText);

    var border = document.createElement('input');
    border.className= 'switch';
    border.type= 'checkbox';
    checkBorder.append(border);

    var slider = document.createElement('div');
    slider.className= 'slider round';
    checkBorder.append(slider);




    map.controls[google.maps.ControlPosition.RIGHT].push(CheckContainer2);




}

function initCheckbox3(){

    CheckContainer3 = document.createElement('div');
    CheckContainer3.style.padding = "0px 16px 0px 10px";

    var boxBorder = document.createElement('div');
    boxBorder.style.backgroundColor = 'white';
    boxBorder.style.cursor = 'pointer';
    boxBorder.style.textAlign = 'center';
    //boxBorder.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.3)';
    CheckContainer3.appendChild(boxBorder);
    

    

    var checkBorder = document.createElement('label');
    checkBorder.className= 'switch';
    checkBorder.style.cursor = 'pointer';
    boxBorder.append(checkBorder);

    checkText = document.createElement('div');
    checkText.style.color =  '#ccc';
    checkText.style.fontFamily = 'Arial,sans-serif';
    checkText.style.fontSize = '16px';
    checkText.style.lineHeight = '38px';
    checkText.style.paddingLeft = '16px';
    checkText.style.paddingRight = '15px';
    checkText.innerHTML = 'Sales:';
    checkBorder.before(checkText);

    var border = document.createElement('input');
    border.className= 'switch';
    border.type= 'checkbox';
    checkBorder.append(border);

    var slider = document.createElement('div');
    slider.className= 'slider round';
    checkBorder.append(slider);



    map.controls[google.maps.ControlPosition.RIGHT].push(CheckContainer3);




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
    map.controls[google.maps.ControlPosition.RIGHT_CENTER].push(deleteContainer);

    // Setup the map listener for the button.
    google.maps.event.addDomListener(deleteContainer, 'click', function() {
        return deleteMessage();
    });
}


/**
 * Load initial markers
 */
 function initMarkers() {
    $.get("get", function(markers) {
        for(var i=0; i < markers.length; i++) {
            //Function closure
            (function () {
            var location = {
                lat: markers[i].lat,
                lng: markers[i].lng
            };

            var picture = {
              url: chooseImage(markers[i].type),
              size: new google.maps.Size(100, 100),
              scaledSize: new google.maps.Size(100, 100),
              labelOrigin: new google.maps.Point(20, 50),
            };

            var marker = new google.maps.Marker({
                position: location,
                topic: markers[i].topic,
                type: markers[i].type,
                comment: markers[i].comment,
                score: markers[i].score,
                id: markers[i]._id,
                map: map,
                icon: picture,
                animation: google.maps.Animation.DROP
            });
            markerCluster.addMarker(marker, true);  
            var infoBox;

        //    $.post("get_box", {
        //        "lat": marker.position.lat(),
       //         "lng": marker.position.lng(),
       //      }, function(infobox) {

                var infoBox = new InfoBox({
                    boxStyle: {
                        borderRadius: "10px",
                        border: "6px solid rgba(43, 132, 237, 1.0)",
                        textAlign: "center",
                        fontSize: "12pt",
                        width: "300px",
                        display: "none",
                        backgroundColor: "rgba(255, 255, 255, 1.0)"
                    },
                    pixelOffset: new google.maps.Size(-150, -300),
                    enableEventPropagation: true,
                    closeBoxURL: "",
                });

                var previewBox = new InfoBox({
                    boxStyle: {
                        borderRadius: "10px",
                        border: "6px solid rgba(43, 132, 237, 0.5)",
                        textAlign: "center",
                        fontSize: "12pt",
                        width: "150px",
                        display: "block",
                        backgroundColor: "rgba(255, 255, 255, 1.0)"                  },
                    pixelOffset: new google.maps.Size(-75, -175),
                    enableEventPropagation: true,
                    closeBoxURL: "",
                });
                loc_string = locToString(marker.position.lat(), marker.position.lng())
                initMarkerListener(marker, loc_string, infoBox, previewBox, markers[i].comment);
                initInfoBox(infoBox, previewBox, marker.topic, markers[i].comment, marker);
                disableDrop();

                // Attach preview to marker.
                previewBox.open(map, marker);
      //       });
          }());
        }
    });
 }


function filterCows(){
    if(!filterMode) {
        enableFilter();
    } else {
        disableFilter();
    }
}

function enableFilter(){
    filterText.innerHTML = "All Cows";
    filterMode=true;
    deleteContainer.className = "options inactive";
    cowBtnContainer.className = "options inactive";
    
    CheckContainer.className = "options ";
    CheckContainer2.className = "options ";
    CheckContainer3.className = "options ";

}

function disableFilter(){
    filterText.innerHTML = "Filter Cows";
    filterMode=false;
    deleteContainer.className = "options";
    cowBtnContainer.className = "options";
   
    CheckContainer.className = "options inactive";
    CheckContainer2.className = "options inactive";
    CheckContainer3.className = "options inactive";
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
    radiusMarker.setVisible(true);
    map.panTo(centerMarker.position);
    map.setZoom(18);
    if ($("#guide-footer").hasClass('active') == false) {
        $("#guide-footer").addClass('active');
    }
    $("#guide-text").text('Drop a cow within the gray area.');
    $("#guide-text").css('color', 'rgba(43, 132, 237, 1)');

    // Remove the add comment and delete pin functionality if drop mode is true.
    deleteContainer.className = "options inactive";
    filterContainer.className = "options inactive";
}

/**
 * Disables the message drop mode.
 */
function disableDrop() {
    cowBtnText.innerHTML = "Drop a Cow!";
    dropMode = false;
    radiusMarker.setVisible(false);
    if ($("#guide-footer").hasClass('active')) {
        $("#guide-footer").removeClass('active');
    }

    // Add the add comment and delete pin functionality if drop mode is false.
    deleteContainer.className = "options";
    filterContainer.className = "options";

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

    // Initialize pin with visuals and text.
    var infoBox = new InfoBox({
        boxStyle: {
            borderRadius: "10px",
            border: "8px solid rgba(43, 132, 237, 1.0)",
            textAlign: "center",
            fontSize: "12pt",
            width: "300px",
            display: "block",
            backgroundColor: "rgba(255, 255, 255, 1.0)"
        },
        pixelOffset: new google.maps.Size(-150, -300),
        enableEventPropagation: false,
        closeBoxURL: ""
    });

    var previewBox = new InfoBox({
        boxStyle: {
            borderRadius: "10px",
            border: "6px solid rgba(43, 132, 237, 0.5)",
            textAlign: "center",
            fontSize: "12pt",
            width: "150px",
            display: "block",
            backgroundColor: "rgba(255, 255, 255, 1.0)"
        },
        pixelOffset: new google.maps.Size(-75, -175),
        enableEventPropagation: false,
        closeBoxURL: ""
    });

    var picture = {
        url: chooseImage(type),
        size: new google.maps.Size(100, 100),
        scaledSize: new google.maps.Size(100, 100),
        labelOrigin: new google.maps.Point(20, 50),
    };

    //Post marker info to routes
    var marker = ""
    $.post("add_marker", {
          "picture": 'img/cow.png',
          "topic": topic,
          "type": type,
          "comment": comments,
          "score": 0,
          "lat": location.lat(),
          "lng": location.lng(),
    }, function() {
            $.post("get_current_marker", {
                "lat": location.lat(),
                "lng": location.lng(),
             },
            function(markers) {
                markerID = markers[0]._id
                marker = new google.maps.Marker({
                    position: location,
                    map: map,
                    topic: topic,
                    type: type,
                    comment: comments,
                    score: 0,
                    id: markerID,
                    icon: picture,
                    animation: google.maps.Animation.DROP,
                    created: true
                });
                markerCluster.addMarker(marker, true);
                currentCow = marker;

                loc_string = locToString(location.lat(), location.lng());

                initMarkerListener(marker, loc_string, infoBox, previewBox, comments);
                initInfoBox(infoBox, previewBox, topic, comments, marker);
                disableDrop();
                //Post infobox to routes
                $.post("add_box", {
                    "lat": location.lat(),
                    "lng": location.lng(),
                    "content": comments
                 })

                previewBox.open(map, marker);

                map.panTo(location)

            });

    });


}


/** Database functions **/

/**
 * Inits event listeners for the marker.
 * @param {object} marker - The marker that the listener will be attached to.
 * @param {string} location - The latitude and longitude in string form,
 *                            separated by a space.
 */
function initMarkerListener(marker, location, infoBox, previewBox, comments) {
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
        enlargeMessage(location, marker, infoBox, previewBox, comments);
    });
    shrinkMessage(location, marker, infoBox, previewBox);
}

/**
 * Given the location of a marker, the message attached to that marker will
 * shrink down to the topic-only message.
 * @param {string} location - The string representation of the location, should
 *                            utilize locToString.
 */
function shrinkMessage(location, infoBox, previewBox) {
    infoBox.setOptions({
        boxStyle: {
            borderRadius: "10px",
            border: "6px solid rgba(43, 132, 237, 1.0)",
            textAlign: "center",
            fontSize: "12pt",
            width: "300px",
            display: "none",
            backgroundColor: "rgba(255, 255, 255, 1.0)"
        }
    });

    previewBox.setOptions({
        boxStyle: {
            borderRadius: "10px",
            border: "6px solid rgba(43, 132, 237, 0.5)",
            textAlign: "center",
            fontSize: "12pt",
            width: "150px",
            display: "block",
            backgroundColor: "rgba(255, 255, 255, 1.0)"
        }
    });
}

/**
 * Given the location of a marker, the message attached to that marker will
 * expand to the full message.
 * @param {string} location - The string representation of the location, should
 *                            utilize locToString.
 */
function enlargeMessage(location, marker, infoBox, previewBox, comments) {
    // Closes infoBox and returns if clicking on an open message
    if(currInfo == infoBox) {
        shrinkMessage(locToString(location), currInfo, currPreview);
        currInfo = null
        currPreview = null
        return;
    }

    // Shrink the contents of the previously opened message, if available.
    if (currInfo != null) {
       shrinkMessage(locToString(location), currInfo, currPreview);
    }
    currInfo = infoBox;
    currPreview = previewBox;
    currentCow = marker;
    initInfoBox(infoBox, previewBox, marker.topic, marker.comment, marker);


    infoBox.setOptions({
        boxStyle: {
            borderRadius: "10px",
            border: "6px solid rgba(43, 132, 237, 1.0)",
            textAlign: "center",
            fontSize: "12pt",
            width: "300px",
            display: "block",
            backgroundColor: "rgba(255, 255, 255, 1.0)"
        }
    });

    previewBox.setOptions({
        boxStyle: {
            borderRadius: "10px",
            border: "6px solid rgba(43, 132, 237, 0.5)",
            textAlign: "center",
            fontSize: "12pt",
            width: "150px",
            display: "none",
            backgroundColor: "rgba(255, 255, 255, 1.0)"
        }
    });
    infoBox.open(map, marker)

    // Attach preview to marker.
    //previewBox.open(map, marker);
    var position = {
        lat: currentCow.position.lat(),
        lng: currentCow.position.lng()
    }

    map.panTo(position);
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
 * Inits the contents of the info and preview box, and then attaches both boxes
 * to the given marker.
 * @param {object} infoBox - Infobox object that will display the full message.
 * @param {object} previewBox - Infobox object that only displays the topic.
 * @param {string} topic - The topic of the message.
 * @param {string} comments - The comment of the message.
 */
function initInfoBox(infoBox, previewBox, topic, comments, marker) {
    // Initialize the topic.
    var topicHTML = document.createElement('h3');
    var topicContent = document.createTextNode(topic);
    topicHTML.className += 'topic-header';
    topicHTML.appendChild(topicContent);

    // Initialize the votes and message.
    var commentHTML = document.createElement('table');
    commentHTML.appendChild(parseComment(comments, marker.score));

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

    // Initialize the preview window with just the topic.
    var previewHTML = document.createElement('h3');
    previewHTML.className += 'topic-header';
    previewHTML.innerHTML = topic;
    previewBox.setContent(previewHTML);
}

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
    var downvoteDiv = document.createElement('div');
    downvoteDiv.className += 'increment down';
    var countDiv = document.createElement('div');
    countDiv.className += 'count';
    countDiv.id = comments
    countDiv.innerHTML = score;

    //Adds id if it is not the main comment
    if(isOtherComment == true) {
        countDiv.value = "other"
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
    loc_string = locToString(currentCow.position.lat(), currentCow.position.lng());
    // Clear the contents of the modal.
    var commentsDiv = document.getElementById("comments-div");
    if (commentsDiv != null) {
        commentsDiv.innerHTML = "";
    }

    // Recreate the contents of the message.
    var topicHeader = document.getElementById("topic-header");
    if (topicHeader != null) {
        topicHeader.innerHTML = currentCow.topic;
    }

    var mainComment = document.createElement('table');
    mainComment.className += 'comments-table';
    mainComment.id = 'main-comment';
    mainComment.appendChild(parseComment(currentCow.comment, currentCow.score));
    commentsDiv.appendChild(mainComment);

    $.post("get_comments", {
        "lat": currentCow.position.lat(),
        "lng": currentCow.position.lng(),
    }, function(comments) {

            for(var j = 0; j < comments.length; j++) {
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
    loc_string = locToString(currentCow.getPosition().lat(), currentCow.getPosition().lng());
    var commentBox = document.getElementById("add-comment");
    if (commentBox.value != "") {
        $.post("get_comment", {
            "content": commentBox.value,
            "lat": currentCow.getPosition().lat(), 
            "lng": currentCow.getPosition().lng(),
        }, function(comment) {
            if(comment.length > 0) {
                return;
            }
            else {
                $.post("add_comment", {
                "content": commentBox.value,
                "score": 0,
                "lat": currentCow.getPosition().lat(), 
                "lng": currentCow.getPosition().lng(),
            });
            commentBox.value = "";
            loadComments(currentCow);
            }
        });
    }
}

//Only deletes the message if the user created it before reloading the page
function deleteMessage() {
    if (currentCow != null && currentCow.created == true) {
        $.post("delete_box", {
            "lat": currentCow.position.lat(),
            "lng": currentCow.position.lng(),
        });
        $.post("delete_marker", {
            "lat": currentCow.position.lat(),
            "lng": currentCow.position.lng(),
        });
        currentCow.setMap(null);
        markerCluster.removeMarker(currentCow);
        currentCow = null
    }

    else {
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

//Voting function.  Updates either main comment or other comment
$(document).on('click', '.increment', function() {
    var count = parseInt($("~ .count", this).text());
    var content = $(this).parent().closest("div").find('.count').get(0).id
    var type = $(this).parent().closest("div").find('.count').get(0).value

    if ($(this).hasClass("up")) {
        var count = count + 1;
        $.post("update_score", {
            "lat": currentCow.position.lat(),
            "lng": currentCow.position.lng(),
            "content": content,
            "score": count,
            "type": type,
        });
        currentCow.score += 1;

        $("~ .count", this).text(count);
    } else {
        var count = count - 1;
        $.post("update_score", {
            "lat": currentCow.position.lat(),
            "lng": currentCow.position.lng(),
            "content": content,
            "score": count,
            "type": type,
        });
        currentCow.score -= 1;
        $("~ .count", this).text(count);
    }

    $(this).parent().addClass("bump");

    setTimeout(function() {
        $(this).parent().removeClass("bump");
    }, 400);
});