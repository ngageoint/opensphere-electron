// Node Modules
const config = require('config');
const path = require('path');


/**
 * If Electron is running in a development environment.
 * @type {boolean}
 */
const isDev = require('electron-is-dev');


/**
 * If Electron is running the debug application.
 * @type {boolean}
 */
const isDebug = isDev && process.argv.includes('--debug');


/**
 * Base path for the Electron app.
 * @type {string}
 */
const basePath = isDev ? path.resolve('..') : path.join(process.resourcesPath, 'app.asar');


/**
 * Location of the base application.
 * @type {string}
 */
const baseApp = config.has('electron.baseApp') ? config.get('electron.baseApp') : 'opensphere';


/**
 * Location of preload scripts.
 * @type {string}
 */
const preloadDir = path.join(__dirname, 'preload');


/**
 * Initialize environment variables based on the current environment.
 * @param {string} osPath Base path to opensphere.
 */
const initEnvVars = (osPath) => {
  if (isDev) {
    process.env.ELECTRON_IS_DEV = isDev;

    // This allows scripts to add this to module.paths if they want to pick up
    // native deps built for electron out of opensphere-electron/app/node_modules
    process.env.ELECTRON_EXTRA_PATH = module.paths[1];
  }
};


module.exports = {baseApp, basePath, isDev, isDebug, initEnvVars, preloadDir};
