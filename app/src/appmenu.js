// Node Modules
const config = require('config');
const isDev = require('electron-is-dev');

// Electron Modules
const {app, globalShortcut, BrowserWindow, Menu} = require('electron');

// Local Modules
const appEnv = require('./appenv.js');
const {getAppUrl} = require('./apppath.js');
const {checkForUpdates} = require('./autoupdate.js');


/**
 * The application menu.
 */
let appMenu;


/**
 * Create the Edit application menu.
 * @return {!Object} The menu configuration.
 */
const createEditMenu = () => ({
  label: 'Edit',
  submenu: [{
    label: 'Undo',
    accelerator: 'CmdOrCtrl+Z',
    role: 'undo'
  }, {
    label: 'Redo',
    accelerator: 'Shift+CmdOrCtrl+Z',
    role: 'redo'
  }, {
    type: 'separator'
  }, {
    label: 'Cut',
    accelerator: 'CmdOrCtrl+X',
    role: 'cut'
  }, {
    label: 'Copy',
    accelerator: 'CmdOrCtrl+C',
    role: 'copy'
  }, {
    label: 'Paste',
    accelerator: 'CmdOrCtrl+V',
    role: 'paste'
  }, {
    label: 'Select All',
    accelerator: 'CmdOrCtrl+A',
    role: 'selectall'
  }]
});


/**
 * Create the View application menu.
 * @return {!Object} The menu configuration.
 */
const createViewMenu = () => {
  const menu = {
    label: 'View',
    submenu: [{
      label: 'Reload',
      accelerator: 'CmdOrCtrl+R',
      click: (item, focusedWindow) => {
        if (focusedWindow) {
          // on reload, start fresh and close any old open secondary windows
          if (focusedWindow.id === 1) {
            BrowserWindow.getAllWindows().forEach((win) => {
              if (win.id > 1) {
                win.close();
              }
            });
          }
          focusedWindow.reload();
        }
      }
    }, {
      label: 'Toggle Full Screen',
      accelerator: process.platform === 'darwin' ? 'Ctrl+Command+F' : 'F11',
      click: (item, focusedWindow) => {
        if (focusedWindow) {
          focusedWindow.setFullScreen(!focusedWindow.isFullScreen());
        }
      }
    }]
  };

  if (isDev) {
    menu.submenu.push({
      label: 'Toggle Developer Tools',
      accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
      click: (item, focusedWindow) => {
        if (focusedWindow) {
          focusedWindow.toggleDevTools();
        }
      }
    });
  } else {
    // Allow opening Dev Tools via shortcut.
    const shortcut = process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I';
    globalShortcut.register(shortcut, () => {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (focusedWindow) {
        focusedWindow.toggleDevTools();
      }
    });
  }

  return menu;
};


/**
 * History menu item identifiers.
 * @enum {string}
 */
const HistoryItemId = {
  BACK: 'go-back',
  FORWARD: 'go-forward',
  HOME: 'go-home'
};


/**
 * Create the History application menu.
 * @return {!Object} The menu configuration.
 */
const createHistoryMenu = () => {
  // Only add the history menu if other apps are defined. By default, OpenSphere is a single-page app and does not
  // benefit from navigation.
  if (!config.has('electron.apps')) {
    return null;
  }

  const homeUrl = getAppUrl(appEnv.baseApp, appEnv.basePath);

  return {
    label: 'History',
    submenu: [{
      id: HistoryItemId.HOME,
      label: 'Home',
      visible: !!homeUrl,
      accelerator: process.platform === 'darwin' ? 'Command+Shift+H' : 'Alt+Home',
      click: (item, focusedWindow) => {
        if (focusedWindow && homeUrl) {
          focusedWindow.loadURL(homeUrl);
        }
      }
    }, {
      id: HistoryItemId.BACK,
      label: 'Back',
      accelerator: process.platform === 'darwin' ? 'Command+Left' : 'Alt+Left',
      click: (item, focusedWindow) => {
        if (focusedWindow && focusedWindow.webContents) {
          focusedWindow.webContents.goBack();
        }
      }
    }, {
      id: HistoryItemId.FORWARD,
      label: 'Forward',
      accelerator: process.platform === 'darwin' ? 'Command+Right' : 'Alt+Right',
      click: (item, focusedWindow) => {
        if (focusedWindow && focusedWindow.webContents) {
          focusedWindow.webContents.goForward();
        }
      }
    }]
  };
};


/**
 * Create the Window application menu.
 * @return {!Object} The menu configuration.
 */
const createWindowMenu = () => {
  const menu = {
    label: 'Window',
    role: 'window',
    submenu: [{
      label: 'Minimize',
      accelerator: 'CmdOrCtrl+M',
      role: 'minimize'
    }, {
      label: 'Close',
      accelerator: 'CmdOrCtrl+W',
      role: 'close'
    }, {
      type: 'separator'
    }, {
      label: 'Reopen Window',
      accelerator: 'CmdOrCtrl+Shift+T',
      enabled: false,
      key: 'reopenMenuItem',
      click: () => {
        app.emit('activate');
      }
    }]
  };

  if (process.platform === 'darwin') {
    menu.submenu.push({
      type: 'separator'
    }, {
      label: 'Bring All to Front',
      role: 'front'
    });
  }

  return menu;
};


/**
 * Create the Help application menu.
 * @return {!Object} The menu configuration.
 */
const createHelpMenu = () => ({
  label: 'Help',
  submenu: [{
    label: 'Check for Updates...',
    click: () => {
      checkForUpdates(true);
    }
  }]
});


/**
 * Create the menu configuration template.
 * @return {!Array<!Object>}
 */
const createTemplate = () => {
  const editMenu = createEditMenu();
  const viewMenu = createViewMenu();
  const historyMenu = createHistoryMenu();
  const windowMenu = createWindowMenu();
  const helpMenu = createHelpMenu();

  const template = [editMenu, viewMenu, historyMenu, windowMenu, helpMenu].filter((menu) => !!menu);

  if (process.platform === 'darwin') {
    const name = app.name;
    template.unshift({
      label: name,
      submenu: [{
        label: `About ${name}`,
        role: 'about'
      }, {
        type: 'separator'
      }, {
        label: `Hide ${name}`,
        accelerator: 'Command+H',
        role: 'hide'
      }, {
        label: 'Hide Others',
        accelerator: 'Command+Alt+H',
        role: 'hideothers'
      }, {
        label: 'Show All',
        role: 'unhide'
      }, {
        type: 'separator'
      }, {
        label: 'Quit',
        accelerator: 'Command+Q',
        click: () => {
          app.quit();
        }
      }]
    });
  }

  return template;
};


/**
 * Create the application menu.
 */
const createAppMenu = () => {
  if (!appMenu) {
    const template = createTemplate();

    appMenu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(appMenu);

    // update the history menu when the focused window changes
    app.on('browser-window-focus', () => {
      updateHistoryMenu();
    });
  }
};


/**
 * Update the history menu.
 */
const updateHistoryMenu = () => {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (appMenu && focusedWindow) {
    const backItem = appMenu.getMenuItemById(HistoryItemId.BACK);
    if (backItem) {
      backItem.enabled = focusedWindow.webContents.canGoBack();
    }

    const forwardItem = appMenu.getMenuItemById(HistoryItemId.FORWARD);
    if (forwardItem) {
      forwardItem.enabled = focusedWindow.webContents.canGoForward();
    }
  }
};


app.on('web-contents-created', (event, contents) => {
  // Update history menu (forward/back state) on navigation.
  contents.on('did-navigate', (event) => {
    updateHistoryMenu();
  });

  // Update history menu (forward/back state) on page navigation (URL hash change).
  contents.on('did-navigate-in-page', (event) => {
    updateHistoryMenu();
  });
});


module.exports = {createAppMenu, updateHistoryMenu};
