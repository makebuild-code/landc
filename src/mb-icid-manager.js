class IDManager {
  /**
   * Constructs the IDManager with configurable parameters for handling IDs.
   * @param { boolean } [ debug = false ] - Enable debug logging if true.
   * @param { string } [ attributeName ] - Custom attribute name on the body tag to find the ID.
   * @param { string } [ queryParam ] - The query parameter name to find the ID in the URL.
   * @param { string } [ cookieName ] - The key to store the cookie in the browser.
   * @param { number } [ cookieDays = 90 ] - The number of days until the cookie expires.
   * @param { string } [ linkSelector ] - CSS selector for links to append ID.
   */
  constructor({
    debug = false,
    attributeName,
    queryParam,
    cookieName,
    cookieDays = 90,
    linkSelector,
  } = {}) {
    this.debug = debug;
    this.attributeName = attributeName;
    this.queryParam = queryParam;
    this.cookieName = cookieName;
    this.cookieDays = cookieDays;
    this.linkSelector = linkSelector;

    this.init();
  }

  /**
   * Initializes the ID handling process.
   */
  init() {
    const value =
      this.getValueFromBody() ?? this.getValueFromParam() ?? this.getCookie();
    if (!value) return;

    this.setCookie(value);
    this.appendValueToLinks(value);
  }

  /**
   * Gets the ID from the <body> element.
   * @returns { string | undefined }
   */
  getValueFromBody() {
    const value = document.body.getAttribute(this.attributeName);
    return value;
  }

  /**
   * Gets the ID from the URL query parameter
   * @returns { string | null } The value of the query parameter if it exists; otherwise, null.
   */
  getValueFromParam() {
    const params =
      this.queryParam === "bp_e"
        ? this.getEncodedParams()
        : this.getDecodedParams();

    if (!Array.isArray(params)) return null;

    for (const param of params) {
      if (param.key.toLowerCase() !== this.queryParam.toLowerCase()) continue;
      this.debugLog(`Match - Key: ${param.key}, Value: ${param.value}`);
      return param.value;
    }

    this.debugLog(`No match found for ${this.queryParam}`);
    return null;
  }

  /**
   * An encoded array of key-value pairs from the URL search parameters.
   * @returns { Array<{key: string, value: string}> }
   */
  getEncodedParams() {
    const { search } = window.location;

    // Parse manually to avoid automatic URL decoding
    if (!search || search.length <= 1) return []; // Only runs when there is atleast one param

    const queryString = search.substring(1); // Remove leading '?'
    const pairs = queryString.split("&");

    const encoded = [];
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

  /**
   * A decoded array of key-value pairs from the URL search parameters.
   * @returns { Array<{key: string, value: string}> }
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
   * Retrieves a cookie by name.
   * @returns { string | null } The value of the cookie if found; otherwise, null.
   */
  getCookie() {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${this.cookieName}=`);
    if (parts.length !== 2) return null;
    return parts.pop().split(";").shift();
  }

  /**
   * Sets a cookie with the specified name and value for a number of days.
   * @param { string } value - The value of the ID to store.
   */
  setCookie(value) {
    const date = new Date();
    date.setTime(date.getTime() + this.cookieDays * 24 * 60 * 60 * 1000);
    const safeValue = encodeURIComponent(value);
    const expires = "expires=" + date.toUTCString();

    document.cookie = `${this.cookieName}=${safeValue};${expires};path=/`;

    this.debugLog(`Cookie set - ${this.cookieName}: ${value}`);
  }

  /**
   * Appends the ID to all links that match the linkSelector.
   */
  appendValueToLinks(value) {
    if (!value || !this.linkSelector) return;

    const links = document.querySelectorAll(this.linkSelector);
    [...links].forEach((link) => {
      try {
        const url = new URL(link.href);
        url.searchParams.set(this.queryParam, value);
        link.href = url.toString();
        this.debugLog(`Value appended to URL: ${url}`);
      } catch (error) {
        this.debugLog(`Error appending value to link: ${link.href}`, error);
      }
    });
  }

  debugLog(...args) {
    if (this.debug) console.log(`[IDManager] ${this.cookieName}:`, ...args);
  }
}
