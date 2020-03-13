const config = require('config');
const fs = require('fs');
const path = require('path');
const log = require('electron-log');

const {app, dialog, ipcMain, shell} = require('electron');
const {autoUpdater} = require('electron-updater');

const appEnv = require('./appenv.js');


/**
 * The main window object. Used to display status updates.
 * @type {BrowserWindow}
 */
let mainWindow;


/**
 * If a development auto update config (dev-app-update.yml) is present.
 * @return {boolean}
 *
 * @see https://www.electron.build/auto-update#debugging
 */
const hasDevConfig = () => fs.existsSync(path.join(process.cwd(), 'dev-app-update.yml'));


/**
 * Check for application updates.
 */
const checkForUpdates = () => {
  // Don't check for updates in a dev environment.
  if (!appEnv.isDev || hasDevConfig()) {
    autoUpdater.checkForUpdates();
  }
};


/**
 * Initialize auto updates.
 * @param {BrowserWindow} win The primary browser window, to show status updates.
 */
const initAutoUpdate = (win) => {
  mainWindow = win;

  autoUpdater.autoDownload = false;
  autoUpdater.logger = log;

  autoUpdater.on('download-progress', onDownloadProgress);
  autoUpdater.on('error', onError);
  autoUpdater.on('update-available', onUpdateAvailable);
  autoUpdater.on('update-downloaded', onUpdateDownloaded);

  // Wait for the app to register a certificate handler before checking for updates, so the user will be prompted if
  // the update endpoint requires a certificate.
  ipcMain.once('client-certificate-handler-registered', checkForUpdates);
};


/**
 * Dispose auto updates.
 */
const disposeAutoUpdate = () => {
  mainWindow = null;

  autoUpdater.removeListener('download-progress', onDownloadProgress);
  autoUpdater.removeListener('error', onError);
  autoUpdater.removeListener('update-available', onUpdateAvailable);
  autoUpdater.removeListener('update-downloaded', onUpdateDownloaded);

  ipcMain.removeListener('client-certificate-handler-registered', checkForUpdates);
};


/**
 * Handle update download progress event.
 * @param {DownloadProgress} info The download progress info.
 */
const onDownloadProgress = (info) => {
  if (mainWindow && info && info.percent != null) {
    mainWindow.setProgressBar(info.percent / 100);
  }
};


/**
 * Handle update error event.
 * @param {Error} error The error.
 */
const onError = (error) => {
  log.error(String(error));

  dialog.showMessageBox(mainWindow, {
    type: 'error',
    title: 'Update Failed',
    message: `The ${app.name} update failed. Please view the log for details.`,
    buttons: ['OK'],
    defaultId: 0
  });
};


/**
 * Handle update download selection.
 * @param {number} index The selected button index.
 */
const onUpdateSelection = (index) => {
  if (index === 0) {
    if (appEnv.isDev || process.env.PORTABLE_EXECUTABLE_DIR) {
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
const onUpdateAvailable = (info) => {
  // Prompt that a new version is available when using an installed app, or the release page is configured.
  if (mainWindow && (!process.env.PORTABLE_EXECUTABLE_DIR || config.has('electron.releaseUrl'))) {
    onUpdateSelection(dialog.showMessageBoxSync(mainWindow, {
      type: 'info',
      title: 'Update Available',
      message: `A new version of ${app.name} (${info.version}) is available. Would you like to download it now?`,
      buttons: ['Yes', 'No'],
      defaultId: 0
    }));
  }
};


/**
 * Handle user selection from app update install dialog.
 * @param {number} index The selected button index.
 */
const onInstallSelection = (index) => {
  if (index === 0) {
    log.debug('Restarting application to install update.');
    autoUpdater.quitAndInstall();
  }
};


/**
 * Handle update downloaded event.
 * @param {UpdateInfo} info The update info.
 */
const onUpdateDownloaded = (info) => {
  if (mainWindow) {
    mainWindow.setProgressBar(-1);

    if (process.platform !== 'darwin') {
      const message = 'Update has been downloaded. Would you like to install it now, or wait until the next time ' +
          `${app.name} is launched?`;

      onInstallSelection(dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Downloaded',
        message: message,
        buttons: ['Install', 'Wait'],
        defaultId: 0
      }));
    } else {
      // quitAndInstall doesn't seem to work on macOS, so just notify the user to restart the app.
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Downloaded',
        message: `Update has been downloaded, and will be applied the next time ${app.name} is launched.`,
        buttons: ['OK'],
        defaultId: 0
      });
    }
  }
};


module.exports = {checkForUpdates, initAutoUpdate, disposeAutoUpdate};
