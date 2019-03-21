/* eslint-disable */

const child_process = require('child_process');
const fs = require('fs');
const path = require('path');
const process = require('process');
const {webFrame} = require('electron');

// allow the file:// protocol to be used by the fetch API
webFrame.registerURLSchemeAsPrivileged('file');

/**
 * Fork a child process.
 * @param {string} modulePath The module to run in the child.
 * @param {Array|undefined} args List of string arguments.
 * @param {Object|undefined} options The process options.
 * @return {!Object} The process.
 */
const forkProcess = function(modulePath, args, options) {
  return child_process.fork(modulePath, args, options);
};

/**
 * Get Electron environment options for use in child processes.
 * @return {!Object}
 */
const getElectronEnvOptions = function() {
  var options = {
    env: {
      ELECTRON_EXTRA_PATH: process.env.ELECTRON_EXTRA_PATH
    }
  };

  if ('electron' in process.versions) {
    options.env.ELECTRON_VERSION = process.versions.electron;
  }

  return options;
};

/**
 * Resolve a path relative to the OpenSphere base path.
 * @param {string} base The base path.
 * @return {string} The resolved path.
 */
const resolveOpenspherePath = function(base) {
  return path.join(process.env.OPENSPHERE_PATH, base);
};

/**
 * Asynchronously remove a file or symbolic link.
 * @param {string} file The file.
 * @param {Function} callback Function to call when the unlink completes.
 */
const unlinkFile = function(file, callback) {
  fs.unlink(file, callback);
};

//
// Expose a minimal interface to the Node environment for use in OpenSphere.
//
// For more information, see:
// https://electronjs.org/docs/tutorial/security#2-disable-nodejs-integration-for-remote-content
//
window.ElectronExports = {
  getElectronEnvOptions: getElectronEnvOptions,
  forkProcess: forkProcess,
  resolveOpenspherePath: resolveOpenspherePath,
  unlinkFile: unlinkFile
};
