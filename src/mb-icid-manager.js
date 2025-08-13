class IDManager {
  /**
   * Constructs the IDManager with configurable parameters for handling IDs.
   * @param {boolean} [debug = true] - Enable debug logging if true.
   * @param {string} [idCookieName = 'ID'] - The key to store the cookie in the browser.
   * @param {string} [idQueryParam] - The query parameter name to find the ID in the URL.
   * @param {number} [cookieDays = 90] - The number of days until the cookie expires.
   * @param {string} [linkSelector = ''] - CSS selector for links to append ID.
   * @param {string} [customBodyAttribute = ''] - Custom attribute name on the body tag to find the ID.
   */
  constructor({
    debug = true,
    idCookieName = "ID",
    idQueryParam,
    cookieDays = 90,
    linkSelector = "",
    customBodyAttribute = "",
  } = {}) {
    this.debug = debug;
    this.idCookieName = idCookieName;
    this.idQueryParam = idQueryParam;
    this.cookieDays = cookieDays;
    this.linkSelector = linkSelector;
    this.customBodyAttribute = customBodyAttribute;
    this.id = null;

    this.init();
  }

  debugLog(...args) {
    if (this.debug) {
      console.log(`[IDManager] ${this.idCookieName}:`, ...args);
    }
  }

  /**
   * Initializes the ID handling process.
   */
  init() {
    const idSetFromBodyAttribute = this.updateIDFromCustomAttribute();
    if (!idSetFromBodyAttribute) this.storeID();
    this.appendIDToLinks();
  }

  /**
   * Updates the ID based on a custom attribute on the <body> element.
   * @returns {boolean} Whether the ID was set from the custom body attribute.
   */
  updateIDFromCustomAttribute() {
    if (!this.customBodyAttribute) {
      this.debugLog("No custom body attribute defined.");
      return false;
    }

    const bodyAttributeID = document.body.getAttribute(
      this.customBodyAttribute
    );

    if (!bodyAttributeID) {
      this.debugLog(
        `No value found for body attribute: ${this.customBodyAttribute}`
      );
      return false;
    }

    this.setCookie(bodyAttributeID);
    this.id = bodyAttributeID;
    this.debugLog(`ID from body attribute set: ${bodyAttributeID}`);
    return true;
  }

  /**
   * Stores the ID from the URL query parameter to a cookie.
   */
  storeID() {
    const id = this.getQueryParamValue();
    if (!id) {
      this.debugLog(`ID not found in query parameters.`);
      return;
    }

    this.setCookie(id);
    this.id = id;
  }

  /**
   * Appends the ID to all links that match the linkSelector.
   */
  appendIDToLinks() {
    if (!this.linkSelector || !this.id) return;

    const links = document.querySelectorAll(this.linkSelector);
    [...links].forEach((link) => {
      const url = new URL(link.href);
      url.searchParams.set(this.idQueryParam, this.id);
      link.href = url.toString();
      this.debugLog(`ID appended to URL: ${url}`);
    });
  }

  /**
   * Retrieves the value of the URL parameter specified by idQueryParam.
   * @returns {string | null} The value of the query parameter, if it exists; otherwise, null.
   */
  getQueryParamValue() {
    const params =
      this.idQueryParam === "bp_e"
        ? this.getEncodedParams()
        : this.getDecodedParams();

    if (!Array.isArray(params)) return null;

    for (const param of params) {
      if (param.key === this.idQueryParam) {
        this.debugLog(
          `Matched QueryParam - Key: ${param.key}, Value: ${param.value}`
        );
        return param.value;
      }
    }

    this.debugLog(`No matching query parameter found for ${this.idQueryParam}`);
    return null;
  }

  /**
   * A decoded array of key-value pairs from the URL search parameters.
   * @returns {Array<{key: string, value: string}>}
   */
  getDecodedParams() {
    const { search } = window.location;
    const params = new URLSearchParams(search);
    const decoded = [];

    if (!params || params.size === 0) return decoded;

    for (const [key, value] of params.entries()) {
      decoded.push({ key, value });
    }

    return decoded;
  }

  /**
   * An encoded array of key-value pairs from the URL search parameters.
   * @returns {Array<{key: string, value: string}>}
   */
  getEncodedParams() {
    const { search } = window.location;

    // Parse manually to avoid automatic URL decoding
    if (search && search.length > 1) {
      const queryString = search.substring(1); // Remove leading '?'
      const pairs = queryString.split("&");

      const encoded = [];

      if (!pairs || pairs.length === 0) return encoded;

      for (const pair of pairs) {
        const separatorIndex = pair.indexOf("=");
        if (separatorIndex !== -1) {
          const key = pair.substring(0, separatorIndex);
          const value = pair.substring(separatorIndex + 1);
          encoded.push({ key, value });
        }
      }

      return encoded;
    }
  }

  /**
   * Sets a cookie with the specified name and value for a number of days.
   * @param {string} value - The value of the ID to store.
   */
  setCookie(value) {
    const d = new Date();
    d.setTime(d.getTime() + this.cookieDays * 24 * 60 * 60 * 1000);
    let expires = "expires=" + d.toUTCString();
    document.cookie = `${this.idCookieName}=${value};${expires};path=/`;
    this.debugLog(`Cookie set - ${this.idCookieName}: ${value}`);
  }

  /**
   * Retrieves a cookie by name.
   * @returns {string|null} The value of the cookie if found; otherwise, null.
   */
  getCookie() {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${this.idCookieName}=`);
    if (parts.length === 2) return parts.pop().split(";").shift();
    return null;
  }
}
