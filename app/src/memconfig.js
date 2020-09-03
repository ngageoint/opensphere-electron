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
  let appMemory = process.getSystemMemoryInfo().total / 2048 | 0;

  const userDataPath = (electron.app || electron.remote.app).getPath('userData');
  const memoryConfigPath = userDataPath + memoryConfigFileName;
  if (fs.existsSync(memoryConfigPath)) {
    appMemory = parseInt(fs.readFileSync(memoryConfigPath));
  }

  return appMemory;
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

module.exports = {getMaximumMemory, setMaximumMemory};
