// Node Modules
const config = require('config');
const fs = require('fs');
const path = require('path');
const log = require('electron-log');
const {autoUpdater} = require('electron-updater');

// Electron Modules
const {app, dialog, ipcMain, BrowserWindow} = require('electron');

// Local Modules
const appEnv = require('./appenv.js');
const {openExternal} = require('./appnav.js');


/**
 * If the app is currently being updated.
 * @type {boolean}
 */
let updating = false;


/**
 * File to track the application version for the most recent auto update attempt.
 * @type {string}
 */
const ignoreFile = '.autoupdateignore';


/**
 * File to track the application version for the most recent auto update attempt.
 * @type {string}
 *
 * @see https://www.electronjs.org/docs/api/app#appgetpathname
 */
const ignorePath = appEnv.isDev ?
    // In development, put the file in opensphere-electron.
    path.resolve('.', ignoreFile) :
    // In production, get the Electron userData path for the application.
    path.join(app.getPath('userData'), ignoreFile);


/**
 * The most recent auto update version found.
 * @type {!Array<string>}
 */
const ignoredVersions = fs.existsSync(ignorePath) ?
    JSON.parse(fs.readFileSync(ignorePath, 'utf-8')) : [];


/**
 * If a development auto update config (dev-app-update.yml) is present.
 * @return {boolean}
 *
 * @see https://www.electron.build/auto-update#debugging
 */
const hasDevConfig = () => fs.existsSync(path.join(process.cwd(), 'dev-app-update.yml'));


/**
 * Check for application updates.
 * @param {boolean=} user If the check was user-initiated.
 */
const checkForUpdates = (user = false) => {
  // When user initiated, clear the ignored versions cache and set the flag.
  if (user) {
    ignoredVersions.length = 0;
    updating = true;
  }

  // Only check for updates in a dev environment if user-initiated or the dev auto update config is present.
  if (user || !appEnv.isDev || hasDevConfig()) {
    autoUpdater.checkForUpdates();
  }
};


/**
 * Handle IPC client certificate handler registered event.
 * @param {Event} event The event.
 */
const onCertHandlerRegistered = (event) => {
  checkForUpdates();
};


/**
 * Initialize auto updates.
 */
const initAutoUpdate = () => {
  autoUpdater.autoDownload = false;
  autoUpdater.logger = log;

  autoUpdater.on('download-progress', onDownloadProgress);
  autoUpdater.on('error', onError);
  autoUpdater.on('update-available', onUpdateAvailable);
  autoUpdater.on('update-not-available', onUpdateNotAvailable);
  autoUpdater.on('update-downloaded', onUpdateDownloaded);

  // Wait for the app to register a certificate handler before checking for updates, so the user will be prompted if
  // the update endpoint requires a certificate.
  ipcMain.once('client-certificate-handler-registered', onCertHandlerRegistered);
};


/**
 * Dispose auto updates.
 */
const disposeAutoUpdate = () => {
  autoUpdater.removeListener('download-progress', onDownloadProgress);
  autoUpdater.removeListener('error', onError);
  autoUpdater.removeListener('update-available', onUpdateAvailable);
  autoUpdater.removeListener('update-not-available', onUpdateNotAvailable);
  autoUpdater.removeListener('update-downloaded', onUpdateDownloaded);

  ipcMain.removeListener('client-certificate-handler-registered', onCertHandlerRegistered);
};


/**
 * Handle update download progress event.
 * @param {DownloadProgress} info The download progress info.
 */
const onDownloadProgress = (info) => {
  if (info && info.percent != null) {
    updateProgress(info.percent / 100);
  }
};


/**
 * Update the download progress bar for all windows.
 * @param {number} value The progress value.
 */
const updateProgress = (value) => {
  BrowserWindow.getAllWindows().forEach((win) => win.setProgressBar(value));
};


/**
 * Get the target window for providing auto update details to the user. This will be the focused window, or the first
 * available if no window has focus.
 * @return {BrowserWindow|null} The target window.
 */
const getTargetWindow = () => BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0] || null;


/**
 * Handle update error event.
 * @param {Error} error The error.
 */
const onError = (error) => {
  log.error(String(error));

  // If the user requested an update and it fails, display a message so they know something went wrong and the app
  // won't be updated.
  if (updating) {
    updateProgress(-1);

    const targetWindow = getTargetWindow();
    if (targetWindow) {
      if (hasReleaseUrl()) {
        const index = dialog.showMessageBoxSync(targetWindow, {
          type: 'error',
          title: 'Update Failed',
          message: `Unable to update ${app.name}. Would you like to download the new version manually?`,
          buttons: ['Yes', 'No'],
          defaultId: 0
        });

        if (index === 0) {
          openReleaseUrl();
        }
      } else {
        dialog.showMessageBox(targetWindow, {
          type: 'error',
          title: 'Update Failed',
          message: `Unable to update ${app.name}.`,
          buttons: ['OK'],
          defaultId: 0
        });
      }
    }
  }

  updating = false;
};


/**
 * If the application has a release URL configured.
 * @return {boolean}
 */
const hasReleaseUrl = () => config.has('electron.releaseUrl');


/**
 * Launch the release URL in a browser, if configured.
 */
const openReleaseUrl = () => {
  if (hasReleaseUrl()) {
    const releaseUrl = config.get('electron.releaseUrl');
    if (releaseUrl) {
      openExternal(releaseUrl);
    }
  }
};


/**
 * Handle update not available event.
 * @param {UpdateInfo} info The update info.
 */
const onUpdateNotAvailable = (info) => {
  if (updating) {
    updating = false;

    const targetWindow = getTargetWindow();
    if (targetWindow) {
      dialog.showMessageBox(targetWindow, {
        type: 'info',
        title: 'Update Not Available',
        message: `${app.name} is up to date.`,
        buttons: ['OK'],
        defaultId: 0
      });
    }
  }
};


/**
 * Handle update available event.
 * @param {UpdateInfo} info The update info.
 */
const onUpdateAvailable = (info) => {
  if (ignoredVersions.indexOf(info.version) > -1) {
    // User denied updating to this version, skip it.
    log.info(`Update version ${info.version} previously ignored, skipping auto update.`);
    return;
  }

  // Prompt that a new version is available when using an installed app, or the release page is configured.
  const targetWindow = getTargetWindow();
  if (targetWindow && (!process.env.PORTABLE_EXECUTABLE_DIR || config.has('electron.releaseUrl'))) {
    dialog.showMessageBox(targetWindow, {
      type: 'info',
      title: 'Update Available',
      message: `A new version of ${app.name} (${info.version}) is available. Would you like to download it now?`,
      buttons: ['Yes', 'No'],
      checkboxLabel: 'Do not ask again for this version',
      defaultId: 0
    }).then((retval) => {
      if (retval.response === 0) {
        if (appEnv.isDev || process.env.PORTABLE_EXECUTABLE_DIR) {
          // Dev/portable apps can't be updated automatically, so open the release page.
          openReleaseUrl();
        } else {
          updating = true;

          dialog.showMessageBox(targetWindow, {
            type: 'info',
            title: 'Update Downloading',
            message: 'Update is being downloaded, and you will be notified when it completes.',
            buttons: ['OK'],
            defaultId: 0
          });

          autoUpdater.downloadUpdate();
        }
      } else if (retval.checkboxChecked) {
        ignoredVersions.push(info.version);
        fs.writeFileSync(ignorePath, JSON.stringify(ignoredVersions), 'utf-8');
      }
    });
  }
};


/**
 * Handle update downloaded event.
 * @param {UpdateInfo} info The update info.
 */
const onUpdateDownloaded = (info) => {
  updating = false;

  const targetWindow = getTargetWindow();
  if (targetWindow) {
    updateProgress(-1);

    if (process.platform !== 'darwin') {
      const index = dialog.showMessageBoxSync(targetWindow, {
        type: 'info',
        title: 'Update Downloaded',
        message: 'Update has been downloaded. Would you like to install it now, or wait until the next time ' +
            `${app.name} is launched?`,
        buttons: ['Install', 'Wait'],
        defaultId: 0
      });

      if (index === 0) {
        log.debug('Restarting application to install update.');
        autoUpdater.quitAndInstall();
      }
    } else {
      // quitAndInstall doesn't seem to work on macOS, so just notify the user to restart the app.
      dialog.showMessageBox(targetWindow, {
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
