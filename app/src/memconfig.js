const fs = require('fs');
const {app, remote} = require('electron');
const log = require('electron-log');
const path = require('path');

/**
 * The file name containing memory configuration data.
 */
const memoryConfigFileName = '.maxmemory';

/**
 * The User's data directory.
 */
let userDataPath = '';

if (app) {
  userDataPath = app.getPath('userData');
} else if (remote && remote.app) {
  userDataPath = remote.app.getPath('userData');
}

/**
 * The full path including filename to where the memory configuration file is located.
 */
const memoryConfigPath = path.join(userDataPath, memoryConfigFileName);

/**
 * The total available RAM in MB.
 */
const systemMemory = process.getSystemMemoryInfo().total / 1024 | 0;

/**
 * Default to using half of the system's RAM.
 */
const defaultAppMemory = systemMemory / 2 | 0;

/**
 * Gets the configured maximum memory for the system.
 * @return {Number} The maximum memory for the system in MB.
 */
const getMaximumMemory = () => {
  let appMemory = defaultAppMemory;

  if (fs.existsSync(memoryConfigPath)) {
    const parsedMem = parseInt(fs.readFileSync(memoryConfigPath));
    if (parsedMem >= 512) {
      appMemory = parsedMem;
    }
  }

  return appMemory;
};

/**
 * Gets the total available memory for the system.
 * @return {Number} The total available memory for the system in MB.
 */
const getSystemMemory = () => {
  return systemMemory;
};

/**
 * Sets the maximum memory for the system.
 * @param {string} maxMemory The maximum memory for the system in MB.
 */
const setMaximumMemory = (maxMemory) => {
  log.info('Changing applications maximum memory to ' + maxMemory + ' MB.');
  fs.writeFileSync(memoryConfigPath, maxMemory, 'utf-8');
  log.info('Memory configuration changed saved to ' + memoryConfigPath);
};

/**
 * Set the maximum memory command line flags.
 */
const setMemoryFlags = () => {
  const maxMemory = getMaximumMemory();
  log.info('Setting applications maximum memory to ' + maxMemory + ' MB.');
  if (app) {
    app.commandLine.appendSwitch('js-flags', '--max-old-space-size=' + maxMemory);
  } else if (remote && remote.app) {
    remote.app.commandLine.appendSwitch('js-flags', '--max-old-space-size=' + maxMemory);
  }
};

module.exports = {getMaximumMemory, getSystemMemory, setMaximumMemory, setMemoryFlags};
