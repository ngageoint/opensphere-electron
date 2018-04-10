const {app, dialog, shell, BrowserWindow, Menu} = require('electron');
const {autoUpdater} = require('electron-updater');

const path = require('path');
const url = require('url');

// Configure logger.
const log = require('electron-log');
log.transports.file.level = 'debug';

// Determine which environment we're running in.
const isDev = require('electron-is-dev');
const isDebug = isDev && process.argv.includes('--debug');

// When running in production, update the location for app configuration.
if (!isDev) {
  process.env.NODE_CONFIG_DIR = path.join(process.resourcesPath, 'app.asar', 'config');
}

// Load app configuration.
const config = require('config');

// Determine the location of OpenSphere.
const osPath = isDev ?
    path.resolve('..', 'opensphere') :
    path.join(process.resourcesPath, 'app.asar', 'opensphere');

// Determine the location of OpenSphere's index.html.
const osIndexPath = isDebug || !isDev ?
    path.join(osPath, 'index.html') :
    path.join(osPath, 'dist', 'opensphere', 'index.html');

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
 * Create the main application window.
 */
const createMainWindow = function() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    webPreferences: {
      // Don't throttle animations/timers when backgrounded.
      backgroundThrottling: false,
      // Use native window.open so external windows can access their parent.
      nativeWindowOpen: true,
      // Disable CORS.
      webSecurity: false
    }
  });

  // Load the app from the file system.
  mainWindow.loadURL(url.format({
    pathname: osIndexPath,
    protocol: 'file:',
    slashes: true
  }));

  // Emitted when the window is closed.
  mainWindow.on('closed', function() {
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

  // Launch OpenSphere.
  createMainWindow();

  if (!isDev) {
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
