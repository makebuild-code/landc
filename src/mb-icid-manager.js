class IDManager {
    /**
     * Constructs the IDManager with configurable parameters for handling IDs.
     * @param {Object} config - Configuration object for IDManager.
     * @param {boolean} [config.debug=true] - Enable debug logging if true.
     * @param {string} [config.idCookieName='ID'] - The name of the cookie for storing the ID.
     * @param {string} config.idQueryParam - The query parameter name for the ID, case-insensitive.
     * @param {number} [config.cookieDays=90] - The number of days until the cookie expires.
     * @param {string} [config.linkSelector=''] - CSS selector for links to append ID. Optional.
     * @param {string} [config.customBodyAttribute=''] - Custom attribute name on the body tag for the ID. Optional.
     */
    constructor({
        debug = true,
        idCookieName = 'ID',
        idQueryParam,
        cookieDays = 90,
        linkSelector = '',
        customBodyAttribute = '',
    } = {}) {
        this.debug = debug
        this.idCookieName = idCookieName
        this.idQueryParam = idQueryParam.toLowerCase() // Normalize to lower case for case-insensitive handling
        this.cookieDays = cookieDays
        this.linkSelector = linkSelector
        this.customBodyAttribute = customBodyAttribute
    }

    debugLog(message) {
        if (this.debug) {
            //console.log(`IDManager, ${this.idCookieName}:`, message)
        }
    }

    /**
     * Initializes the ID handling process.
     */
    init() {
        // Attempt to update ID from the custom body attribute first.
        const idSetFromBodyAttribute = this.updateIDFromCustomAttribute()

        // Store the ID from the URL only if it wasn't set by the body attribute.
        if (!idSetFromBodyAttribute) {
            this.storeID()
        }

        // Append the ID to all relevant links if linkSelector is specified,
        // regardless of where the ID was set from.
        this.appendIDToLinks()
    }

    /**
     * Updates the ID based on a custom attribute on the <body> element.
     * Returns true if the ID was found and set, false otherwise.
     * @returns {boolean} Whether the ID was set from the custom body attribute.
     */
    updateIDFromCustomAttribute() {
        if (this.customBodyAttribute) {
            const bodyAttributeID = document.body.getAttribute(
                this.customBodyAttribute
            )
            if (bodyAttributeID) {
                this.setCookie(bodyAttributeID)
                this.debugLog(`ID from body attribute set: ${bodyAttributeID}`)
                return true // Indicate that the ID was successfully set from the body attribute.
            } else {
                // Custom body attribute is present but has no value
                this.debugLog(
                    `No value found for body attribute: ${this.customBodyAttribute}`
                )
                return false
            }
        } else {
            // No custom body attribute defined
            this.debugLog('No custom body attribute defined.')
            return false // No ID was set from the body attribute.
        }
    }

    /**
     * Stores the ID from the URL query parameter to a cookie.
     */
    storeID() {
        const id = this.getQueryParam()
        if (id) {
            this.setCookie(id)
        }
    }

    /**
     * Appends the ID to all links that match the linkSelector.
     */
    appendIDToLinks() {
        if (!this.linkSelector) return // Skip if linkSelector is not defined

        const links = document.querySelectorAll(this.linkSelector)
        const id = this.getCookie()
        if (id) {
            links.forEach((link) => {
                const url = new URL(link.href)
                url.searchParams.set(this.idQueryParam, id)
                link.href = url.toString()
                this.debugLog(`ID appended to URL: ${url}`)
            })
        }
    }

    /**
     * Retrieves the value of the URL parameter specified by idQueryParam, treating parameter names as case-insensitive.
     * @returns {string|null} The value of the query parameter, if it exists; otherwise, null.
     */
    getQueryParam() {
        const urlParams = new URLSearchParams(window.location.search)
        for (const [key, value] of urlParams.entries()) {
            if (key.toLowerCase() === this.idQueryParam.toLowerCase()) {
                this.debugLog(`QueryParam - ${key}: ${value}`)
                return value
            }
        }
        return null
    }

    /**
     * Sets a cookie with the specified name and value for a number of days.
     * @param {string} value - The value of the ID to store.
     */
    setCookie(value) {
        const d = new Date()
        d.setTime(d.getTime() + this.cookieDays * 24 * 60 * 60 * 1000)
        let expires = 'expires=' + d.toUTCString()
        document.cookie = `${this.idCookieName}=${value};${expires};path=/`
        this.debugLog(`Cookie set - ${this.idCookieName}: ${value}`)
    }

    /**
     * Retrieves a cookie by name.
     * @returns {string|null} The value of the cookie if found; otherwise, null.
     */
    getCookie() {
        const value = `; ${document.cookie}`
        const parts = value.split(`; ${this.idCookieName}=`)
        if (parts.length === 2) return parts.pop().split(';').shift()
        return null
    }
}