const {app, dialog, globalShortcut, protocol, shell, BrowserWindow, Menu} = require('electron');
const {autoUpdater} = require('electron-updater');

const config = require('config');
const fs = require('fs');
const log = require('electron-log');
const open = require('open');
const path = require('path');
const slash = require('slash');

const appEnv = require('./appenv.js');
const {getAppPath, getAppFromUrl, getAppUrl} = require('./apppath.js');

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

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

/**
 * Load config for the main process. Keys supported:
 *  - electron.appName: Override the application name returned by app.getName()
 */
const loadConfig = function() {
  if (config.has('electron.appName')) {
    const appName = config.get('electron.appName');
    if (appName) {
      app.setName(appName);
    }
  }
};

/**
 * Get the absolute path for a preload script.
 * @param {string} script The script.
 * @return {string} The absolute path.
 */
const getPreloadPath = function(script) {
  return path.join(appEnv.preloadDir, script);
};

/**
 * Create a new browser window.
 * @param {Electron.WebPreferences} webPreferences The Electron web preferences.
 * @param {Electron.BrowserWindow} parentWindow The opening browser window.
 * @return {Electron.BrowserWindow}
 */
const createBrowserWindow = function(webPreferences, parentWindow) {
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
  browserWindow.webContents.session.webRequest.onHeadersReceived({}, function(details, callback) {
    const headers = Object.keys(details.responseHeaders);
    headers.forEach(function(header) {
      if (discardedHeaders.includes(header.toLowerCase())) {
        delete details.responseHeaders[header];
      }
    });

    callback({cancel: false, responseHeaders: details.responseHeaders});
  });

  browserWindow.webContents.on('new-window', function(event, url, frameName) {
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

  browserWindow.webContents.on('will-navigate', function(event, url) {
    log.debug(`Event [will-navigate]: ${url}`);

    // Internal navigation needs to detect when navigating to a configured app and get the correct URL for that app.
    const decodedUrl = decodeURIComponent(url);
    if (decodedUrl.startsWith('file://') && decodedUrl.indexOf(slash(appEnv.basePath)) > -1) {
      const appName = getAppFromUrl(url);
      if (appName) {
        event.preventDefault();

        // Get the actual app URL, appended with any fragment/query string from the requested URL.
        const appUrl = getAppUrl(appName, appEnv.basePath) + url.replace(/^[^#?]+/, '');
        browserWindow.loadURL(appUrl);
      }
    }
  });

  return browserWindow;
};

/**
 * Open an application browser window.
 * @param {string} appName The app name.
 * @param {string} url The app URL.
 * @param {Electron.BrowserWindow} parentWindow The opening browser window.
 */
const createAppWindow = function(appName, url, parentWindow) {
  // Get the actual app URL, appended with any fragment/query string from the requested URL.
  const appUrl = getAppUrl(appName, appEnv.basePath) + url.replace(/^[^#?]+/, '');

  if (parentWindow && parentWindow.webContents) {
    const appWindow = createBrowserWindow(parentWindow.webContents.getWebPreferences(), parentWindow);
    appWindow.loadURL(appUrl);
  }
};

/**
 * Create the main application window.
 */
const createMainWindow = function() {
  // Default web preferences for the main browser window.
  const webPreferences = {
    // Don't throttle animations/timers when backgrounded.
    backgroundThrottling: false,
    // Use native window.open so external windows can access their parent.
    nativeWindowOpen: true
  };

  // Load additional preferences from config.
  if (config.has('electron.webPreferences')) {
    const configWebPreferences = config.get('electron.webPreferences');
    if (configWebPreferences) {
      Object.assign(webPreferences, configWebPreferences);
    }
  }

  // Create the browser window.
  mainWindow = createBrowserWindow(webPreferences);

  // Load the app from the file system.
  const appUrl = getAppUrl(appEnv.baseApp, appEnv.basePath);

  log.info('loading', appUrl);
  mainWindow.loadURL(appUrl);

  mainWindow.on('crashed', function() {
    log.error('Main window crashed');
  });

  mainWindow.on('destroyed', function() {
    log.error('Main window destroyed');
  });

  // Emitted when the window is closed.
  mainWindow.on('closed', function() {
    // Clean up listeners.
    mainWindow.removeAllListeners();

    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', function() {
  loadConfig();

  // Set up the application menu.
  const template = require('./appmenu.js');
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  // Launch the application.
  createMainWindow();

  if (!appEnv.isDev) {
    // Allow opening Dev Tools via shortcut.
    const shortcut = process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I';
    globalShortcut.register(shortcut, function() {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (focusedWindow) {
        focusedWindow.toggleDevTools();
      }
    });

    // Check for updates, in production only.
    autoUpdater.autoDownload = false;
    autoUpdater.logger = log;
    autoUpdater.checkForUpdates();
  }
});


app.on('window-all-closed', function() {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function() {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createMainWindow();
  }
});

app.on('web-contents-created', function(event, contents) {
  contents.on('will-attach-webview', function(event, webPreferences, params) {
    // Strip away preload scripts because they always have Node integration enabled
    delete webPreferences.preload;
    delete webPreferences.preloadURL;

    // Disable Node.js integration
    webPreferences.nodeIntegration = false;

    // Enable web security
    webPreferences.webSecurity = true;

    // Verify URL being loaded is local to the app
    if (!params.src.startsWith('file://' + appEnv.basePath)) {
      event.preventDefault();
    }
  });
});

/**
 * Handle update download progress event.
 * @param {DownloadProgress} info The download progress info.
 */
const onDownloadProgress = function(info) {
  if (mainWindow && info && info.percent != null) {
    mainWindow.setProgressBar(info.percent / 100);
  }
};

/**
 * Handle update download selection.
 * @param {number} index The selected button index.
 */
const onUpdateSelection = function(index) {
  if (index === 0) {
    if (process.env.PORTABLE_EXECUTABLE_DIR) {
      // Load the portable download page if configured. If not, the user shouldn't have been notified of an update.
      if (config.has('electron.releaseUrl')) {
        const releaseUrl = config.get('electron.releaseUrl');
        if (releaseUrl) {
          shell.openExternal(releaseUrl);
        }
      }
    } else {
      autoUpdater.downloadUpdate();
    }
  }
};

/**
 * Handle update available event.
 * @param {UpdateInfo} info The update info.
 */
const onUpdateAvailable = function(info) {
  // Prompt that a new version is available when using an installed app, or the release page is configured.
  if (!process.env.PORTABLE_EXECUTABLE_DIR || config.has('electron.releaseUrl')) {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Available',
      message: 'A new version of ' + app.getName() + ' (' + info.version + ') is available. ' +
          'Would you like to download it now?',
      buttons: ['Yes', 'No'],
      defaultId: 0
    }, onUpdateSelection);
  }
};

/**
 * Handle user selection from app update install dialog.
 * @param {number} index The selected button index.
 */
const onInstallSelection = function(index) {
  if (index === 0) {
    log.debug('Restarting application to install update.');
    autoUpdater.quitAndInstall();
  }
};

/**
 * Handle update downloaded event.
 * @param {UpdateInfo} info The update info.
 */
const onUpdateDownloaded = function(info) {
  if (mainWindow) {
    mainWindow.setProgressBar(-1);
  }

  if (process.platform !== 'darwin') {
    const message = 'Update has been downloaded. Would you like to install it now, or wait until the next time ' +
          app.getName() + ' is launched?';

    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Downloaded',
      message: message,
      buttons: ['Install', 'Wait'],
      defaultId: 0
    }, onInstallSelection);
  } else {
    // quitAndInstall doesn't seem to work on macOS, so just notify the user to restart the app.
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Downloaded',
      message: 'Update has been downloaded, and will be applied the next time ' + app.getName() + ' is launched.',
      buttons: ['OK'],
      defaultId: 0
    });
  }
};

autoUpdater.on('download-progress', onDownloadProgress);
autoUpdater.on('update-available', onUpdateAvailable);
autoUpdater.on('update-downloaded', onUpdateDownloaded);
