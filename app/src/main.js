// Initialization steps that need to run prior to loading other modules.
require('./initapp.js');

// Node Modules
const config = require('config');
const log = require('electron-log');

// Electron Modules
const {app, protocol, BrowserWindow, ipcMain} = require('electron');

// Local Modules
const appEnv = require('./appenv.js');
const appMenu = require('./appmenu.js');
const {createBrowserWindow} = require('./appnav.js');
const {getAppPath, getAppUrl} = require('./apppath.js');
const {disposeAutoUpdate, initAutoUpdate} = require('./autoupdate.js');
const cookies = require('./cookies.js');
const {getClientCertificate} = require('./usercerts.js');
const {getDefaultWebPreferences} = require('./prefs.js');
const {getMaximumMemory} = require('./memconfig.js');
const {relaunch} = require('./relauncher.js');

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

/**
 * Keep a global reference of the window object, if you don't, the window will
 * be closed automatically when the JavaScript object is garbage collected.
 * @type {BrowserWindow}
 */
let mainWindow;

/**
 * Create the main application window.
 */
const createMainWindow = () => {
  // Abort if there is already a main window reference.
  if (mainWindow) {
    return;
  }

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

  // Load the app from the file system.
  const appUrl = getAppUrl(appEnv.baseApp, appEnv.basePath);

  log.info(`Loading app: ${appUrl}`);
  mainWindow.loadURL(appUrl);

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

const maxMemory = getMaximumMemory();
log.info('Setting applications maximum memory to ' + maxMemory + ' MB.');
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=' + maxMemory);

// Load additional appendSwitches from config.
if (config.has('electron.appendSwitches')) {
  const appendSwitches = config.get('electron.appendSwitches');
  for (let i = 0; i < appendSwitches.length; i++) {
    const appendSwitch = appendSwitches[i];
    if (appendSwitch.value) {
      app.commandLine.appendSwitch(appendSwitch.name, appendSwitch.value);
    } else {
      app.commandLine.appendSwitch(appendSwitch.name);
    }
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  // Set up the application menu.
  appMenu.createAppMenu();

  // Set up cookie IPC handlers.
  cookies.initHandlers();

  // Launch the application.
  createMainWindow();

  // Initialize auto update.
  initAutoUpdate(mainWindow);
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
  if (process.platform === 'darwin' && BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

app.on('web-contents-created', (event, contents) => {
  contents.on('crashed', (event, killed) => {
    log.error('Web contents crashed!');
  });

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

ipcMain.on('restart', (event, value) => {
  relaunch();
});
