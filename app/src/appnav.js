// Node Modules
const config = require('config');
const fs = require('fs');
const log = require('electron-log');
const path = require('path');
const slash = require('slash');

// Electron Modules
const {dialog, shell, BrowserWindow} = require('electron');

// Local Modules
const appEnv = require('./appenv.js');
const {getAppFromUrl, getAppUrl} = require('./apppath.js');


/**
 * XHR response headers that should be discarded.
 * @type {!Array<string>}
 */
const discardedHeaders = [
  'content-security-policy',
  'x-frame-options',
  'x-xss-protection'
];


/**
 * Open an application browser window.
 * @param {string} appName The app name.
 * @param {string} url The app URL.
 * @param {BrowserWindow} parentWindow The opening browser window.
 */
const createAppWindow = (appName, url, parentWindow) => {
  // Get the actual app URL, appended with any fragment/query string from the requested URL.
  const appUrl = getAppUrl(appName, appEnv.basePath) + url.replace(/^[^#?]+/, '');

  if (parentWindow && parentWindow.webContents) {
    log.debug(`Launching app ${appName} with URL ${appUrl}`);

    const appWindow = createBrowserWindow(parentWindow.webContents.getWebPreferences(), parentWindow);
    appWindow.loadURL(appUrl);
  }
};


/**
 * Create a new browser window.
 * @param {WebPreferences} webPreferences The Electron web preferences.
 * @param {BrowserWindow} parentWindow The opening browser window.
 * @return {BrowserWindow}
 */
const createBrowserWindow = (webPreferences, parentWindow) => {
  // Create the browser window.
  const parentBounds = parentWindow ? parentWindow.getBounds() : undefined;
  const browserWindow = new BrowserWindow({
    width: parentBounds ? parentBounds.width : 1600,
    height: parentBounds ? parentBounds.height : 900,
    x: parentBounds ? (parentBounds.x + 25) : undefined,
    y: parentBounds ? (parentBounds.y + 25) : undefined,
    webPreferences: webPreferences
  });

  // Load external preload scripts into the session.
  if (fs.existsSync(appEnv.preloadDir)) {
    const preloads = fs.readdirSync(appEnv.preloadDir);
    browserWindow.webContents.session.setPreloads(preloads.map(getPreloadPath));
  }

  if (config.has('electron.webRequest.requestHeaders')) {
    // Request header overrides from config
    const requestHeaders = config.get('electron.webRequest.requestHeaders');
    browserWindow.webContents.session.webRequest.onBeforeSendHeaders((details, callback) => {
      Object.assign(details.requestHeaders, requestHeaders);

      callback({
        requestHeaders: details.requestHeaders
      });
    });
  }

  // Delete X-Frame-Options header from XHR responses to avoid preventing URL's from displaying in an iframe.
  browserWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const headers = Object.keys(details.responseHeaders);
    headers.forEach((header) => {
      if (discardedHeaders.includes(header.toLowerCase())) {
        delete details.responseHeaders[header];
      }
    });

    callback({cancel: false, responseHeaders: details.responseHeaders});
  });

  browserWindow.webContents.on('new-window', (event, url, frameName) => {
    log.debug(`Event [new-window]: ${url}`);

    // Any path outside of the application should be opened in the system browser
    // Reasons:
    //   1. That's what the user expects
    //   2. That's where all of their login sessions/cookies already are
    //   3. We've purposely axed CORS and XSS security from Electron so that the
    //      user isn't bothered by that nonsense in a desktop app. As soon as you
    //      treat Electron as a generic browser, that tears a hole in everything.
    const decodedUrl = tryDecodeURI(url);
    if (appEnv.isInternalLink(decodedUrl)) {
      log.debug('Opening window internally.');
    } else if (decodedUrl.indexOf('about:blank') === -1 &&
        !(decodedUrl.startsWith('file://') && decodedUrl.indexOf(slash(appEnv.basePath)) > -1)) {
      event.preventDefault();
      openExternal(url);
    } else if (url.indexOf('.html') == -1) {
      // If the HTML file isn't specified in an internal URL, check if a matching app is configured.
      const appName = getAppFromUrl(url);
      if (appName) {
        // Launch the matched app.
        event.preventDefault();
        createAppWindow(appName, url, browserWindow);
      }
    }
  });

  browserWindow.webContents.on('will-navigate', (event, url) => {
    log.debug(`Event [will-navigate]: ${url}`);

    // Internal navigation needs to detect when navigating to a configured app and get the correct URL for that app.
    const decodedUrl = tryDecodeURI(url);
    if (decodedUrl.startsWith('file://') && decodedUrl.indexOf(slash(appEnv.basePath)) > -1) {
      const appName = getAppFromUrl(url);
      if (appName) {
        // Get the actual app URL, appended with any fragment/query string from the requested URL.
        const appUrl = getAppUrl(appName, appEnv.basePath) + url.replace(/^[^#?]+/, '');
        log.debug(`Loading app URL: ${appUrl}`);

        event.preventDefault();
        browserWindow.loadURL(appUrl);
      }
    } else {
      event.preventDefault();
      openExternal(url);
    }
  });

  browserWindow.webContents.on('will-prevent-unload', (event) => {
    // The app is attempting to cancel the unload event. Prompt the user to allow this or not.
    const choice = dialog.showMessageBoxSync(browserWindow, {
      type: 'info',
      buttons: ['Leave', 'Stay'],
      icon: appEnv.iconPath || undefined,
      title: 'Warning!',
      message: 'You have unsaved changes on this page. If you navigate away from this page, your ' +
          'changes will be lost.',
      defaultId: 0,
      cancelId: 1
    });

    if (choice === 0) {
      event.preventDefault();
    }
  });

  return browserWindow;
};


/**
 * Get the absolute path for a preload script.
 * @param {string} script The script.
 * @return {string} The absolute path.
 */
const getPreloadPath = (script) => {
  return path.join(appEnv.preloadDir, script);
};


/**
 * Open a URL using the desktop's default manner.
 * @param {string} url The URL to open.
 */
const openExternal = (url) => {
  log.info(`Opening external window: ${url}`);
  shell.openExternal(url).catch((err) => log.info(err));
};


/**
 * Try to decode a URL. The browser's `decodeURIComponent` throws if the URI is malformed rather than just logging
 * an error and returning the original value, so we do that here.
 * @param {string} url The URL to maybe decode.
 * @return {string} The decoded URL, or the original if there was an error.
 */
const tryDecodeURI = (url) => {
  try {
    return decodeURIComponent(url);
  } catch (e) {
    // Safely log the error into electron output instead of sticking a traceback into a popup window.
    log.error(e);
    log.warn(`URL ${url} contains invalid characters.`);
    return url;
  }
};


module.exports = {createBrowserWindow, openExternal};
