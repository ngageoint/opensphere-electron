const Promise = require('bluebird');
const config = require('config');
const {app, ipcMain} = require('electron');
const log = require('electron-log');
const fs = Promise.promisifyAll(require('fs'));
const path = require('path');

const appEnv = require('./appenv.js');
const {getAppPath} = require('./apppath.js');


/**
 * Settings event types.
 * @enum {string}
 */
const EventType = {
  ADD: 'add-settings',
  GET_FILES: 'get-settings-files',
  GET_BASE_FILE: 'get-base-settings-file',
  GET_USER_DIR: 'get-user-settings-dir',
  REMOVE: 'remove-settings',
  SET: 'set-settings',
  SUPPORTED: 'user-settings-supported',
  UPDATE: 'update-settings'
};


/**
 * The directory containing the original application settings.
 * @type {string}
 */
let appSettingsDir = '';


/**
 * The directory containing user config files and copied app settings.
 * @type {string}
 */
let userSettingsDir = '';


/**
 * The copied base settings file that will be loaded by the application.
 * @type {string}
 */
let baseSettingsFile = '';


/**
 * The default settings file, copied from the original application settings.
 * @type {string}
 */
let defaultSettingsFile = '';


/**
 * Path to the settings configuration file. This stores the list of settings files, their label, etc.
 * @type {string}
 */
let settingsConfigPath = '';


/**
 * Settings files available to the application.
 * @type {!Array<!ElectronOS.SettingsFile>}
 */
let settingsFiles = [];


/**
 * Get the path to the base settings file loaded by the application.
 * @return {string}
 */
const getBaseSettingsFile = () => baseSettingsFile;


/**
 * Get the settings files available to the application.
 * @return {!Array<!ElectronOS.SettingsFile>}
 */
const getSettingsFiles = () => settingsFiles;


/**
 * Get directory containing user config files and copied app settings.
 * @return {!string}
 */
const getUserSettingsDir = () => userSettingsDir;


/**
 * Map settings file to the override path.
 * @param {!ElectronOS.SettingsFile} file The file.
 * @return {string} The override path.
 */
const mapFileToOverride = (file) => {
  let {path} = file;
  if (!file.enabled) {
    path = `!${path}`;
  }
  return path;
};


/**
 * Save the base application settings file and the settings configuration.
 * @return {!Promise} A promise that resolves when the file has been saved.
 */
const saveSettings = async () => {
  if (baseSettingsFile) {
    const overrides = settingsFiles.map(mapFileToOverride);
    await fs.writeFileAsync(baseSettingsFile, JSON.stringify({overrides}, null, 2));
  } else {
    return new Error('App settings path has not been initialized!');
  }

  if (settingsConfigPath) {
    await fs.writeFileAsync(settingsConfigPath, JSON.stringify(settingsFiles, null, 2));
  } else {
    return new Error('Settings config path has not been initialized!');
  }
};


/**
 * Initialize settings path properties used within the module.
 */
const initPaths = () => {
  const appPath = getAppPath(appEnv.baseApp, appEnv.basePath);

  if (appEnv.isDebug) {
    // In the local debug build, copy settings files to .build/userConfig.
    appSettingsDir = path.join(appPath, '.build');
    userSettingsDir = path.join(appSettingsDir, 'userConfig');
  } else if (appEnv.isDev) {
    // In the local compiled build, copy settings files to <app>/dist/<app>/userConfig.
    appSettingsDir = path.join(appPath, 'config');
    userSettingsDir = path.join(appSettingsDir, '..', 'userConfig');
  } else {
    // In the production build, copy settings files to the userData directory (varies by OS).
    // See: https://www.electronjs.org/docs/api/app#appgetpathname
    appSettingsDir = path.join(appPath, 'config');
    userSettingsDir = path.join(app.getPath('userData'), 'config');
  }

  // Base settings file that will be loaded by the application.
  baseSettingsFile = path.join(userSettingsDir, '.settings.json');

  // Original settings copied from the application.
  defaultSettingsFile = path.join(userSettingsDir, '.settings-default.json');

  // Config file for settings loaded in the application.
  settingsConfigPath = path.join(userSettingsDir, '.settings-files.json');
};


/**
 * Create the user settings directory that the app will use to load/store settings files.
 */
const initUserDir = async () => {
  if (userSettingsDir && !fs.existsSync(userSettingsDir)) {
    await fs.mkdirAsync(userSettingsDir);
  }
};


/**
 * Initialize the settings files config.
 */
const initSettingsFiles = async () => {
  if (settingsConfigPath && fs.existsSync(settingsConfigPath)) {
    const content = await fs.readFileAsync(settingsConfigPath);
    settingsFiles = JSON.parse(content);
  } else {
    settingsFiles = [];
  }
};


/**
 * Initialize settings for the base application.
 * @return {!Promise} A promise that resolves when settings have been initialized.
 */
const initAppSettings = async () => {
  if (!supportsUserSettings()) {
    return;
  }

  initHandlers();
  initPaths();
  await initUserDir();
  await initSettingsFiles();

  const appSettingsFile = path.join(appSettingsDir, appEnv.isDebug ? 'settings-debug.json' : 'settings.json');
  if (fs.existsSync(appSettingsFile)) {
    // Copy the original app settings into the user directory.
    await fs.copyFileAsync(appSettingsFile, defaultSettingsFile);

    // If the list of overrides was not loaded from disk, initialize it with the default settings file.
    if (!settingsFiles.length) {
      settingsFiles.push({
        default: true,
        enabled: true,
        label: 'Default',
        path: defaultSettingsFile
      });
    }
  } else {
    log.warn(`Unable to locate app settings file at ${appSettingsFile}!`);
  }

  // Make sure the base settings file is saved.
  await saveSettings();
};


/**
 * Initialize cookie event handlers.
 */
const initHandlers = () => {
  ipcMain.handle(EventType.ADD, onAddSettings);
  ipcMain.handle(EventType.GET_FILES, onGetSettingsFiles);
  ipcMain.handle(EventType.GET_BASE_FILE, onGetBaseSettingsFile);
  ipcMain.handle(EventType.GET_USER_DIR, onGetUserSettingsDir);
  ipcMain.handle(EventType.REMOVE, onRemoveSettings);
  ipcMain.handle(EventType.SET, onSetSettings);
  ipcMain.handle(EventType.UPDATE, onUpdateSettings);
};


/**
 * Dispose cookie event handlers.
 */
const disposeHandlers = () => {
  ipcMain.removeListener(EventType.ADD, onAddSettings);
  ipcMain.removeListener(EventType.GET_FILES, onGetSettingsFiles);
  ipcMain.removeListener(EventType.GET_BASE_FILE, onGetBaseSettingsFile);
  ipcMain.removeListener(EventType.GET_USER_DIR, onGetUserSettingsDir);
  ipcMain.removeListener(EventType.REMOVE, onRemoveSettings);
  ipcMain.removeListener(EventType.SET, onSetSettings);
  ipcMain.removeListener(EventType.UPDATE, onUpdateSettings);
};


/**
 * Save a new settings file.
 * @param {Event} event The event to reply to.
 * @param {!ElectronOS.SettingsFile} file The settings file.
 * @param {string} content The settings content.
 * @return {!Promise<!Array<!ElectronOS.SettingsFile>>} A promise that resolves to the updated list of settings files.
 */
const onAddSettings = async (event, file, content) => {
  file.path = path.join(userSettingsDir, file.path);
  await fs.writeFileAsync(file.path, content);

  const idx = settingsFiles.findIndex((f) => f.path === file.path);
  if (idx === -1) {
    // New file
    settingsFiles.push(file);
  } else {
    // Replace existing file
    settingsFiles[idx] = file;
  }

  await saveSettings();

  return settingsFiles;
};


/**
 * Remove a settings file.
 * @param {Event} event The event to reply to.
 * @param {!ElectronOS.SettingsFile} file The settings.
 * @return {!Promise<!Array<!ElectronOS.SettingsFile>>} A promise that resolves to the updated list of settings files.
 */
const onRemoveSettings = async (event, file) => {
  if (file && file.path !== defaultSettingsFile) {
    const idx = settingsFiles.findIndex((f) => f.path === file.path);
    if (idx > -1) {
      settingsFiles.splice(idx, 1);

      try {
        await fs.unlinkAsync(file.path);
      } catch (e) {
        log.error(`Failed deleting config file at ${file.path}: ${e.message}`);
      }
    }
  }

  await saveSettings();

  return settingsFiles;
};


/**
 * Update a settings file.
 * @param {Event} event The event to reply to.
 * @param {!ElectronOS.SettingsFile} file The settings.
 * @return {!Promise<!Array<!ElectronOS.SettingsFile>>} A promise that resolves to the updated list of settings files.
 */
const onUpdateSettings = async (event, file) => {
  if (file) {
    const idx = settingsFiles.findIndex((f) => f.path === file.path);
    if (idx > -1) {
      settingsFiles[idx] = file;
    }
  }

  await saveSettings();

  return settingsFiles;
};


/**
 * Handle request for the base settings file.
 * @param {Event} event The event.
 */
const onGetBaseSettingsFile = async (event) => baseSettingsFile;


/**
 * Handle request for the settings files.
 * @param {Event} event The event.
 */
const onGetSettingsFiles = async (event) => settingsFiles;


/**
 * Handle request for the user settings directory.
 * @param {Event} event The event.
 */
const onGetUserSettingsDir = async (event) => userSettingsDir;


/**
 * Handle request for the user settings directory.
 * @param {Event} event The event.
 */
const onSupportsUserSettings = async (event) => supportsUserSettings();


/**
 * Handle settings set event from renderer.
 * @param {Event} event The event.
 * @param {!Array<!ElectronOS.SettingsFile>} value The settings file value.
 */
const onSetSettings = async (event, value) => {
  await setSettingsFiles(value);
  return value;
};


/**
 * Set the settings files available to the application.
 * @param {!Array<!ElectronOS.SettingsFile>} value The settings files.
 * @return {!Promise} A promise that resolves when settings files have been updated and saved.
 */
const setSettingsFiles = async (value) => {
  settingsFiles = value;
  await saveSettings();
  return settingsFiles;
};


/**
 * If user settings management is supported.
 * @return {boolean}
 */
const supportsUserSettings = () => {
  return config.has('electron.enableUserSettings') && config.get('electron.enableUserSettings');
};


// Allow the renderer to check if user settings are supported.
ipcMain.handle(EventType.SUPPORTED, onSupportsUserSettings);


module.exports = {
  disposeHandlers,
  getBaseSettingsFile,
  getSettingsFiles,
  getUserSettingsDir,
  initAppSettings,
  setSettingsFiles,
  supportsUserSettings
};
