 // Function to find location name by ID
        function findLocationNameById(id, locationsJson) {
            const locationObject = locationsJson.find(loc => loc.location.id === id);
            return locationObject ? locationObject.location.name : null;
        }

        // Main function to execute on page load
        window.onload = function() {

            const urlParams = new URLSearchParams(window.location.search);
            const locationId = urlParams.get('location');

            if (locationId) {
                // Fetch the JSON data from the external file
                fetch('dyn-locations-minified.json')
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Network response was not ok');
                        }
                        return response.json();
                    })
                    .then(locationsJson => {
                        const locationName = findLocationNameById(locationId, locationsJson);

                        if (locationName) {
                            // Update and display the name element
                            const nameElements = document.querySelectorAll('[dyn-location-inserter="name"]');
                            
                            nameElements.forEach(element => {
                                element.textContent = ` for ${locationName}`;
                                // Use requestAnimationFrame to ensure display update happens after content update
                                requestAnimationFrame(() => {
                                    element.style.display = 'inline';
                                });
                            });
                        } else {
                        }
                    })
                    .catch(error => {
                    });
            } else {
            }
        };
