const electron = require('electron');
const log = require('electron-log');

const appEnv = require('./appenv.js');

/**
 * The electron app.
 */
const app = (electron.app || electron.remote.app);

/**
 * Restarts the application when not in dev mode, when in dev mode just quits the application and logs to the developer
 * to relaunch manually since relaunch doesn't really work in dev mode.
 */
const relaunch = () => {
  if (appEnv.isDev) {
    log.info('Relaunch doesn\'t work in dev mode, please restart the application manually.');
  } else {
    log.info('Restarting application');
    app.relaunch();
  }
  app.quit();
};

module.exports = {relaunch};
