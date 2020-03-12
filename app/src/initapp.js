const path = require('path');
const {app} = require('electron');

//
// Set up environment variables to aid in config loading.
//
// https://github.com/lorenwest/node-config/wiki/Configuration-Files
//
if (!require('electron-is-dev')) {
  // When running in production, update the location for app configuration. This must be done before config is first
  // required, or app configuration will not be loaded properly.
  process.env.NODE_CONFIG_DIR = path.join(process.resourcesPath, 'config');

  // Search for a default-prod.json config file.
  process.env.NODE_APP_INSTANCE = 'prod';
} else {
  // In dev builds, set the app instance so config will search for default-dev.json.
  process.env.NODE_APP_INSTANCE = 'dev';
}

// Now load the config.
const config = require('config');

// Update the app name from config. This is used by the logger/auto update.
if (config.has('electron.appName')) {
  const appName = config.get('electron.appName');
  if (appName) {
    app.name = appName;
  }
}
