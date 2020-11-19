const {ipcMain, session} = require('electron');


/**
 * URL used for storing session cookies.
 * @type {string}
 */
const cookieUrl = 'https://github.com/ngageoint/opensphere-electron';


/**
 * Cookie event types.
 * @enum {string}
 */
const EventType = {
  SET: 'set-cookie',
  UPDATE: 'update-cookies'
};


/**
 * Removes whitespace from a cookie value.
 * @param {string} value The value.
 * @return {string} The trimmed value, or an empty string if value was null/undefined.
 */
const trimCookieValue = (value) => value ? value.trim() : '';


/**
 * Parse cookie options.
 * @param {!Array<string>} options The options.
 * @return {!Object} The parsed options.
 */
const parseCookieOptions = (options) => {
  const result = {};
  options.forEach((opt) => {
    // split the key=value
    const parts = opt.split('=').map(trimCookieValue);
    if (parts.length > 0 && parts[0]) {
      const key = parts[0];
      if (key === 'secure') {
        result[key] = true;
      } else if (parts.length > 1 && parts[1]) {
        result[key] = parts[1];
      }
    }
  });

  return result;
};


/**
 * Handle cookie set event from renderer.
 * @param {Event} event The event.
 * @param {string} value The cookie value.
 */
const onSetCookie = (event, value) => {
  const parts = value ? value.split(';').map(trimCookieValue) : [];
  const keyValue = parts.shift();
  if (keyValue) {
    const kvParts = keyValue.split('=').map(trimCookieValue);
    if (kvParts.length === 2) {
      const name = kvParts[0];
      const value = kvParts[1];
      const options = parseCookieOptions(parts);

      // The expiration date of the cookie as the number of seconds since the UNIX epoch.
      let expirationDate = null;
      if (options['max-age']) {
        // max-age is provided in seconds, so add to "now"
        const maxAge = Number(options['max-age']);
        if (!isNaN(maxAge)) {
          expirationDate = Math.floor(Date.now() / 1000) + maxAge;
        }
      } else if (options['expires']) {
        // expires is provided as a GMT string, parse and convert to seconds.
        const expires = new Date(options['expires']).getTime();
        if (!isNaN(expires)) {
          expirationDate = Math.floor(expires / 1000);
        }
      }

      session.defaultSession.cookies.set({
        url: cookieUrl,
        name: name,
        value: value,
        expirationDate: expirationDate,
        secure: !!options.secure,
        sameSite: options.sameSite || 'lax'
      }).then(() => {
        onUpdateCookies(event);
      });
    }
  }
};


/**
 * Update cookies in a renderer process.
 * @param {Event} event The event to reply to.
 */
const onUpdateCookies = (event) => {
  session.defaultSession.cookies.get({url: cookieUrl}).then((cookies) => {
    const browserCookies = cookies.map((c) => `${c.name}=${c.value}`).join('; ');
    event.reply(EventType.UPDATE, browserCookies);
  });
};


/**
 * Initialize cookie event handlers.
 */
const initHandlers = () => {
  ipcMain.on(EventType.SET, onSetCookie);
  ipcMain.on(EventType.UPDATE, onUpdateCookies);
};


/**
 * Dispose cookie event handlers.
 */
const disposeHandlers = () => {
  ipcMain.removeListener(EventType.SET, onSetCookie);
  ipcMain.removeListener(EventType.UPDATE, onUpdateCookies);
};


module.exports = {initHandlers, disposeHandlers};
