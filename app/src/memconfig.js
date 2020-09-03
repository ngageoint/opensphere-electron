/**
 * Gets the configured maximum memory for the system.
 * @return {Number} The maximum memory for the system in MB.
 */
const getMaximumMemory = () => {
  // Divide by half system memory and convert to MB.
  const appMemory = process.getSystemMemoryInfo().total / 2048 | 0;

  return appMemory;
};


/**
 * Sets the maximum memory for the system.
 * @param {Number} maxMemory The maximum memory for the system in MB.
 */
const setMaximumMemory = (maxMemory) => {
  console.log('Setting applications maximum memory to ' + maxMemory + ' MB.');
};

module.exports = {getMaximumMemory, setMaximumMemory};
