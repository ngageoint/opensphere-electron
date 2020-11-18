/**
 * Get the default web preferences for Electron apps.
 * @return {!Object}
 */
const getDefaultWebPreferences = () => ({
  //
  // Don't throttle animations/timers when backgrounded.
  //
  backgroundThrottling: false,

  //
  // Use native window.open so external windows can access their parent.
  //
  nativeWindowOpen: true,

  //
  // Execute preload scripts in an isolated context.
  //
  // https://www.electronjs.org/docs/tutorial/security#3-enable-context-isolation-for-remote-content
  //
  contextIsolation: true
});


module.exports = {getDefaultWebPreferences};
