const Promise = require('bluebird');
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
  SET: 'set-settings'
};


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
 * Settings files available to the application.
 * @type {!Array<string>}
 */
let settingsFiles = [];


/**
 * Get the path to the base settings file loaded by the application.
 * @return {string}
 */
const getBaseSettingsFile = () => baseSettingsFile;


/**
 * Get the settings files available to the application.
 * @return {!Array<string>}
 */
const getSettingsFiles = () => settingsFiles;


/**
 * Get directory containing user config files and copied app settings.
 * @return {!string}
 */
const getUserSettingsDir = () => userSettingsDir;


/**
 * Write the base application settings file as a list of overrides.
 * @return {!Promise} A promise that resolves when the file has been saved.
 */
const saveBaseSettings = async () => {
  if (baseSettingsFile) {
    const overridesSettings = {
      overrides: settingsFiles
    };

    log.debug(`Writing app settings to: ${baseSettingsFile}`);
    await fs.writeFileAsync(baseSettingsFile, JSON.stringify(overridesSettings, null, 2));
  } else {
    return Promise.reject(new Error('App settings path has not been initialized!'));
  }
};


/**
 * Initialize settings for the base application.
 * @return {!Promise} A promise that resolves when settings have been initialized.
 */
const initAppSettings = async () => {
  //
  // Resolve the base path for settings files.
  //  - The debug app uses <app>/.build.
  //  - The compiled app uses <app>/dist/<app>/config.
  //  - The built Electron app uses <app>/config within the resources directory.
  //
  const appPath = getAppPath(appEnv.baseApp, appEnv.basePath);

  let appSettingsDir = '';
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

  // Create the path for the base settings file loaded by the application.
  baseSettingsFile = path.join(userSettingsDir, 'settings.json');

  if (!fs.existsSync(userSettingsDir)) {
    // Create the user settings directory that the app will use to load/store settings files.
    await fs.mkdirAsync(userSettingsDir);
  } else if (fs.existsSync(baseSettingsFile)) {
    // Base settings file already exists, so load in the list of settings files from the overrides.
    const baseSettings = await fs.readFileAsync(baseSettingsFile);
    if (baseSettings) {
      const baseSettingsJson = JSON.parse(baseSettings);
      settingsFiles = baseSettingsJson.overrides || [];
    }
  }

  const appSettingsFile = path.join(appSettingsDir, appEnv.isDebug ? 'settings-debug.json' : 'settings.json');
  if (fs.existsSync(appSettingsFile)) {
    // Copy the original app settings into the user directory.
    const defaultSettingsFile = path.join(userSettingsDir, 'settings-default.json');
    await fs.copyFileAsync(appSettingsFile, defaultSettingsFile);

    // If the list of overrides was not loaded from disk, initialize it with the default settings and save the file.
    if (!settingsFiles.length) {
      settingsFiles.push(defaultSettingsFile);
    }
  } else {
    log.warn(`Unable to locate app settings file at ${appSettingsFile}!`);
  }

  // Make sure the base settings file is saved.
  await saveBaseSettings();
};


/**
 * Initialize cookie event handlers.
 */
const initHandlers = () => {
  ipcMain.handle(EventType.ADD, onAddSettings);
  ipcMain.handle(EventType.GET_FILES, onGetSettingsFiles);
  ipcMain.handle(EventType.GET_BASE_FILE, onGetBaseSettingsFile);
  ipcMain.handle(EventType.GET_USER_DIR, onGetUserSettingsDir);
  ipcMain.handle(EventType.SET, onSetSettings);
};


/**
 * Dispose cookie event handlers.
 */
const disposeHandlers = () => {
  ipcMain.removeListener(EventType.ADD, onAddSettings);
  ipcMain.removeListener(EventType.GET_FILES, onGetSettingsFiles);
  ipcMain.removeListener(EventType.GET_BASE_FILE, onGetBaseSettingsFile);
  ipcMain.removeListener(EventType.GET_USER_DIR, onGetUserSettingsDir);
  ipcMain.removeListener(EventType.SET, onSetSettings);
};


/**
 * Save a new settings file.
 * @param {Event} event The event to reply to.
 * @param {string} fileName The settings file name.
 * @param {string} content The settings content.
 * @return {!Promise<!Array<string>>} A promise that resolves to the updated list of settings files.
 */
const onAddSettings = async (event, fileName, content) => {
  const filePath = path.join(userSettingsDir, fileName);
  await fs.writeFileAsync(filePath, content);

  if (settingsFiles.indexOf(filePath) === -1) {
    settingsFiles.push(filePath);
  }

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
 * Handle settings set event from renderer.
 * @param {Event} event The event.
 * @param {!Array<string>} value The settings file value.
 */
const onSetSettings = async (event, value) => {
  await setSettingsFiles(value);
  return value;
};


/**
 * Set the settings files available to the application.
 * @param {!Array<string>} value The settings files.
 * @return {!Promise} A promise that resolves when settings files have been updated and saved.
 */
const setSettingsFiles = async (value) => {
  settingsFiles = value;
  await saveBaseSettings();
  return settingsFiles;
};


module.exports = {
  disposeHandlers,
  getBaseSettingsFile,
  getSettingsFiles,
  getUserSettingsDir,
  initAppSettings,
  initHandlers,
  setSettingsFiles
};
