// Initialization steps that need to run prior to loading other modules.
require('./initapp.js');

// Node Modules
const config = require('config');
const fs = require('fs');
const log = require('electron-log');
const open = require('open');
const path = require('path');
const slash = require('slash');

// Electron Modules
const {app, dialog, globalShortcut, protocol, BrowserWindow} = require('electron');

// Local Modules
const appEnv = require('./appenv.js');
const appMenu = require('./appmenu.js');
const {getAppPath, getAppFromUrl, getAppUrl} = require('./apppath.js');
const {disposeAutoUpdate, initAutoUpdate} = require('./autoupdate.js');
const {getUserCertForUrl} = require('./usercerts.js');
const {getDefaultWebPreferences} = require('./prefs.js');

// Configure logger.
log.transports.file.level = 'debug';

// Allow the file:// protocol to be used by the fetch API.
protocol.registerSchemesAsPrivileged([
  {scheme: 'file', privileges: {supportFetchAPI: true}}
]);

// Initialize environment variables.
appEnv.initEnvVars();

// Export the path to 'opensphere' for application use.
process.env.OPENSPHERE_PATH = getAppPath('opensphere', appEnv.basePath);

// XHR response headers that should be discarded.
const discardedHeaders = [
  'content-security-policy',
  'x-frame-options',
  'x-xss-protection'
];

/**
 * Keep a global reference of the window object, if you don't, the window will
 * be closed automatically when the JavaScript object is garbage collected.
 * @type {BrowserWindow}
 */
let mainWindow;

/**
 * Get the absolute path for a preload script.
 * @param {string} script The script.
 * @return {string} The absolute path.
 */
const getPreloadPath = (script) => {
  return path.join(appEnv.preloadDir, script);
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

  // Update history menu (forward/back state) on navigation.
  browserWindow.webContents.on('did-navigate', (event) => {
    appMenu.updateHistoryMenu();
  });

  // Update history menu (forward/back state) on page navigation (URL hash change).
  browserWindow.webContents.on('did-navigate-in-page', (event) => {
    appMenu.updateHistoryMenu();
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
    const decodedUrl = decodeURIComponent(url);
    if (decodedUrl.indexOf('about:blank') === -1 &&
        !(decodedUrl.startsWith('file://') && decodedUrl.indexOf(slash(appEnv.basePath)) > -1)) {
      event.preventDefault();
      open(url);
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
    const decodedUrl = decodeURIComponent(url);
    if (decodedUrl.startsWith('file://') && decodedUrl.indexOf(slash(appEnv.basePath)) > -1) {
      const appName = getAppFromUrl(url);
      if (appName) {
        // Get the actual app URL, appended with any fragment/query string from the requested URL.
        const appUrl = getAppUrl(appName, appEnv.basePath) + url.replace(/^[^#?]+/, '');
        log.debug(`Loading app URL: ${appUrl}`);

        event.preventDefault();
        browserWindow.loadURL(appUrl);
      }
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
 * Get a client certificate for the provided URL.
 * @param {string} url The URL.
 * @param {!Array<!Certificate>} list Available user certificates.
 * @param {function(Certificate)} callback The callback to call on certificate selection.
 * @param {WebContents} webContents The WebContents instance requesting a certificate.
 */
const getClientCertificate = (url, list, callback, webContents) => {
  getUserCertForUrl(url, list, webContents).then((cert) => {
    callback(cert);
  }, (err) => {
    // This intentionally doesn't call the callback, because Electron will remember the decision. If the app was
    // refreshed, we want Electron to try selecting a cert again when the app loads.
    const reason = err && err.message || 'Unspecified reason.';
    log.error(`Client certificate selection failed: ${reason}`);
  });
};

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
 * Create the main application window.
 */
const createMainWindow = () => {
  // Default web preferences for the main browser window.
  const webPreferences = getDefaultWebPreferences();

  // Load additional preferences from config.
  if (config.has('electron.webPreferences')) {
    const configWebPreferences = config.get('electron.webPreferences');
    if (configWebPreferences) {
      Object.assign(webPreferences, configWebPreferences);
    }
  }

  // Create the browser window.
  mainWindow = createBrowserWindow(webPreferences);

  // Initialize auto update.
  initAutoUpdate(mainWindow);

  // Load the app from the file system.
  const appUrl = getAppUrl(appEnv.baseApp, appEnv.basePath);
  appMenu.setHomeUrl(appUrl);

  log.info('loading', appUrl);
  mainWindow.loadURL(appUrl);

  mainWindow.on('crashed', () => {
    log.error('Main window crashed');
  });

  mainWindow.on('destroyed', () => {
    log.error('Main window destroyed');
  });

  // Emitted when the window is closed.
  mainWindow.on('closed', () => {
    // Clean up listeners.
    mainWindow.removeAllListeners();
    disposeAutoUpdate();

    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  // Set up the application menu.
  appMenu.createAppMenu();

  // Launch the application.
  createMainWindow();

  if (!appEnv.isDev) {
    // Allow opening Dev Tools via shortcut.
    const shortcut = process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I';
    globalShortcut.register(shortcut, () => {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (focusedWindow) {
        focusedWindow.toggleDevTools();
      }
    });
  }
});

app.on('select-client-certificate', (event, webContents, url, list, callback) => {
  // Let Electron handle selection if the user doesn't have multiple certificates.
  if (list && list.length > 1) {
    event.preventDefault();
    getClientCertificate(url, list, callback, webContents);
  }
});

app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createMainWindow();
  }
});

app.on('web-contents-created', (event, contents) => {
  contents.on('will-attach-webview', (event, webPreferences, params) => {
    // Strip away preload scripts because they always have Node integration enabled
    delete webPreferences.preload;
    delete webPreferences.preloadURL;

    // Disable Node.js integration
    webPreferences.nodeIntegration = false;

    // Enable web security
    webPreferences.webSecurity = true;

    // Verify URL being loaded is local to the app
    if (!params.src.startsWith(`file://${appEnv.basePath}`)) {
      event.preventDefault();
    }
  });
});
