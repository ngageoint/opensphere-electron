const fs = require('fs');
const electron = require('electron');
const log = require('electron-log');

const memoryConfigFileName = '/maxmemory.txt';

/**
 * Gets the configured maximum memory for the system.
 * @return {Number} The maximum memory for the system in MB.
 */
const getMaximumMemory = () => {
  // Divide by half system memory and convert to MB.
  let appMemory = getSystemMemory() / 2 | 0;

  const userDataPath = (electron.app || electron.remote.app).getPath('userData');
  const memoryConfigPath = userDataPath + memoryConfigFileName;
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
  // Cconvert to MB.
  return process.getSystemMemoryInfo().total / 1024 | 0;
};

/**
 * Sets the maximum memory for the system.
 * @param {Number} maxMemory The maximum memory for the system in MB.
 */
const setMaximumMemory = (maxMemory) => {
  log.info('Changing applications maximum memory to ' + maxMemory + ' MB.');
  const userDataPath = (electron.app || electron.remote.app).getPath('userData');
  const memoryConfigPath = userDataPath + memoryConfigFileName;
  fs.writeFileSync(memoryConfigPath, maxMemory, 'utf-8');
  log.info('Memory configuration changed saved to ' + memoryConfigPath);
};

module.exports = {getMaximumMemory, getSystemMemory, setMaximumMemory};
