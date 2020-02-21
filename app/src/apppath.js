const config = require('config');
const path = require('path');
const url = require('url');

const appEnv = require('./appenv.js');


/**
 * Get the path for an application.
 * @param {string} appName The application name.
 * @param {string} basePath The base application path.
 * @return {string} The application path.
 */
const getAppPath = (appName, basePath) => {
  let appPath;

  const configKey = `electron.apps.${appName}`;
  const appConfig = config.has(configKey) ? config.get(configKey) : {};
  const baseAppPath = appConfig.path || appName;

  if (appEnv.isDev) {
    // Development (command line) path
    appPath = path.resolve(basePath, baseAppPath);

    if (!appEnv.isDebug) {
      // Compiled app
      appPath = path.resolve(appPath, 'dist', baseAppPath);
    }
  } else {
    // Production path
    appPath = path.join(basePath, baseAppPath);
  }

  return appPath;
};


/**
 * Get the URL to load an application.
 * @param {string} appName The application name.
 * @param {string} baseUrl The base application URL.
 * @return {string} The application URL.
 */
const getAppUrl = (appName, baseUrl) => {
  const appPath = getAppPath(appName, baseUrl);
  return url.format({
    pathname: path.join(appPath, 'index.html'),
    protocol: 'file:',
    slashes: true
  });
};


/**
 * Get the app name from a URL.
 * @param {string} url The URL.
 * @return {?string} The app name, or null if not found.
 */
const getAppFromUrl = (url) => {
  let matchedApp = null;
  if (config.has('electron.apps')) {
    const apps = config.get('electron.apps');
    for (const appName in apps) {
      if (url.indexOf(appName) != -1 && (!matchedApp || matchedApp.length < appName.length)) {
        matchedApp = appName;
      }
    }
  }
  return matchedApp;
};


module.exports = {getAppPath, getAppFromUrl, getAppUrl};
