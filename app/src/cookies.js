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
 * Update cookies in a renderer process.
 * @param {WebContents} webContents The WebContents instance to update.
 */
const updateRendererCookies = (webContents) => {
  session.defaultSession.cookies.get({url: cookieUrl}).then((cookies) => {
    const browserCookies = cookies.map((c) => `${c.name}=${c.value}`).join('; ');
    webContents.send(EventType.UPDATE, browserCookies);
  });
};


/**
 * Handle cookie set event from renderer.
 * @param {Event} event The event.
 * @param {string} value The cookie value.
 */
const onSetCookie = (event, value) => {
  const parts = value.split(';');
  if (parts.length > 0) {
    const kvParts = parts[0].split('=');
    if (kvParts.length === 2) {
      const name = kvParts[0];
      const value = kvParts[1];

      session.defaultSession.cookies.set({
        url: cookieUrl,
        name: name,
        value: value
      }).then(() => {
        if (event.sender) {
          updateRendererCookies(event.sender);
        }
      });
    }
  }
};


/**
 * Handle cookie update event from renderer.
 * @param {Event} event The event.
 */
const onUpdateCookies = (event) => {
  if (event.sender) {
    updateRendererCookies(event.sender);
  }
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
  ipcMain.removeListener(EventType.UPDATE, updateRendererCookies);
};


module.exports = {initHandlers, disposeHandlers};
