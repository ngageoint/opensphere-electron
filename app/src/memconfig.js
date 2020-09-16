const fs = require('fs');
const electron = require('electron');
const log = require('electron-log');
const path = require('path');

/**
 * The file name containing memory configuration data.
 */
const memoryConfigFileName = '.maxmemory';

/**
 * The User's data directory.
 */
const userDataPath = (electron.app || electron.remote.app).getPath('userData');

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
 * @param {Number} maxMemory The maximum memory for the system in MB.
 */
const setMaximumMemory = (maxMemory) => {
  log.info('Changing applications maximum memory to ' + maxMemory + ' MB.');
  fs.writeFileSync(memoryConfigPath, maxMemory, 'utf-8');
  log.info('Memory configuration changed saved to ' + memoryConfigPath);
};

module.exports = {getMaximumMemory, getSystemMemory, setMaximumMemory};
