// Node Modules
const config = require('config');
const path = require('path');
const {URL, format} = require('url');

// Local Modules
const appEnv = require('./appenv.js');


/**
 * Get the path for a bundled resource.
 * @param {string} resource The name of the bundled resource to get.
 * @return {string}
 */
const getResourcePath = (resource) => {
  return format({
    pathname: path.join(appEnv.extraResourcePath, resource),
    protocol: 'file:',
    slashes: true
  });
};


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
  return format({
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

    // Try matching an app path, starting from the end of the URL pathname
    const parts = new URL(url).pathname.split('/').reverse();
    for (const part of parts) {
      if (apps.hasOwnProperty(part)) {
        matchedApp = part;
        break;
      }
    }
  }
  return matchedApp;
};


module.exports = {getAppPath, getAppFromUrl, getAppUrl, getResourcePath};
