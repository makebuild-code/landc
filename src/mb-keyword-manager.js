class DynamicKeywordInserter {
    /**
     * Create a DynamicKeywordInserter.
     * @param {Object} paramMappings - An object mapping URL parameters to their respective class selectors.
     * @param {boolean} [debug=false] - Flag to enable console debugging logs.
     */
    constructor(paramMappings, debug = true) {
        this.paramMappings = paramMappings
        this.debug = debug
        this.keywords = this.fetchKeywordsFromURL()
    }

    /**
     * Initializes the keyword population process. Calls methods to populate or hide elements.
     */
    init() {
        this.debugLog('Initializing DynamicKeywordInserter...')
        Object.entries(this.paramMappings).forEach(([param, selector]) => {
            const keyword = this.keywords[param]
            if (keyword) {
                this.debugLog(`Keyword found for ${param}: ${keyword}`)
                this.populateKeywords(selector, keyword)
            } else {
                this.debugLog(
                    `No keyword found for ${param}. Hiding keyword elements.`
                )
                this.hideKeywordElements(selector)
            }
        })
    }

    /**
     * Fetches the keywords from the URL parameters.
     * @returns {Object} The keywords values indexed by parameter name or null if not found.
     */
    fetchKeywordsFromURL() {
        const urlParams = new URLSearchParams(window.location.search)
        return Object.keys(this.paramMappings).reduce((acc, param) => {
            acc[param] = urlParams.get(param) || null
            return acc
        }, {})
    }

    /**
     * Replaces the text content of elements selected by the class selector with the keyword.
     * @param {string} selector - The CSS selector for the elements to target.
     * @param {string} keyword - The keyword to insert.
     */
    populateKeywords(selector, keyword) {
        document.querySelectorAll(selector).forEach((element) => {
            const prevText =
                element.previousSibling &&
                element.previousSibling.nodeType === Node.TEXT_NODE
                    ? element.previousSibling.textContent
                    : ''
            const hasNextTextSibling =
                element.nextSibling &&
                element.nextSibling.nodeType === Node.TEXT_NODE
            const nextText = hasNextTextSibling
                ? element.nextSibling.textContent.trim()
                : ''

            // Determine space before keyword
            const spaceBefore = prevText && !prevText.endsWith(' ') ? ' ' : ''

            // Determine if a period or space should follow the keyword
            let punctuationAfter = hasNextTextSibling ? '' : '.' // Default to adding a period if there's no next text sibling
            if (hasNextTextSibling) {
                if (!nextText || /^[,.;!?\)]/.test(nextText)) {
                    punctuationAfter = '' // No space or period if the next text starts with punctuation
                } else if (!nextText.startsWith(' ')) {
                    punctuationAfter = ' ' // Add a space if the next sibling text does not start with a space
                }
            } else if (/[,.!?]$/.test(keyword)) {
                punctuationAfter = '' // No period if the keyword already ends with punctuation
            }

            element.textContent = `${spaceBefore}${keyword}${punctuationAfter}`

            this.debugLog(
                `Updated keyword for ${selector}: '${element.textContent}'.`
            )
        })
    }

    /**
     * Hides all elements that are supposed to contain the keyword when the keyword is not present.
     * @param {string} selector - The CSS selector for the elements to hide.
     */
    hideKeywordElements(selector) {
        const elements = document.querySelectorAll(selector)
        elements.forEach((element) => {
            element.style.display = 'none'
            this.debugLog(`Hid element using selector: ${selector}.`)
        })
    }

    /**
     * Logs messages to the console if debugging is enabled.
     * @param {string} message - The message to log.
     * @param {...any} optionalParams - Additional parameters to log.
     */
    debugLog(message, ...optionalParams) {
        if (this.debug) {
            //console.log(message, ...optionalParams)
        }
    }
}