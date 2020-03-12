// Node Modules
const isDev = require('electron-is-dev');

// Electron Modules
const {app, BrowserWindow, Menu} = require('electron');

/**
 * The application menu.
 */
let appMenu;

/**
 * The app's home URL, used for the History > Home menu item.
 * @type {string}
 */
let homeUrl = '';

const editMenu = {
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
};

const viewMenu = {
  label: 'View',
  submenu: [{
    label: 'Reload',
    accelerator: 'CmdOrCtrl+R',
    click: function(item, focusedWindow) {
      if (focusedWindow) {
        // on reload, start fresh and close any old open secondary windows
        if (focusedWindow.id === 1) {
          BrowserWindow.getAllWindows().forEach(function(win) {
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
    click: function(item, focusedWindow) {
      if (focusedWindow) {
        focusedWindow.setFullScreen(!focusedWindow.isFullScreen());
      }
    }
  }]
};

if (isDev) {
  viewMenu.submenu.push({
    label: 'Toggle Developer Tools',
    accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
    click: function(item, focusedWindow) {
      if (focusedWindow) {
        focusedWindow.toggleDevTools();
      }
    }
  });
}

const HistoryItemId = {
  BACK: 'go-back',
  FORWARD: 'go-forward',
  HOME: 'go-home'
};

const historyMenu = {
  label: 'History',
  submenu: [{
    id: HistoryItemId.HOME,
    label: 'Home',
    visible: false,
    accelerator: process.platform === 'darwin' ? 'Command+Shift+H' : 'Alt+Home',
    click: function(item, focusedWindow) {
      if (focusedWindow && homeUrl) {
        focusedWindow.loadURL(homeUrl);
      }
    }
  }, {
    id: HistoryItemId.BACK,
    label: 'Back',
    accelerator: process.platform === 'darwin' ? 'Command+Left' : 'Alt+Left',
    click: function(item, focusedWindow) {
      if (focusedWindow && focusedWindow.webContents) {
        focusedWindow.webContents.goBack();
      }
    }
  }, {
    id: HistoryItemId.FORWARD,
    label: 'Forward',
    accelerator: process.platform === 'darwin' ? 'Command+Right' : 'Alt+Right',
    click: function(item, focusedWindow) {
      if (focusedWindow && focusedWindow.webContents) {
        focusedWindow.webContents.goForward();
      }
    }
  }]
};

const windowMenu = {
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
    click: function() {
      app.emit('activate');
    }
  }]
};

const template = [editMenu, viewMenu, historyMenu, windowMenu];

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
      click: function() {
        app.quit();
      }
    }]
  });

  const windowMenu = template.find(function(item) {
    return item.label === 'Window';
  });

  if (windowMenu) {
    windowMenu.submenu.push({
      type: 'separator'
    }, {
      label: 'Bring All to Front',
      role: 'front'
    });
  }
}


/**
 * Create the application menu.
 */
const createAppMenu = () => {
  if (!appMenu) {
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
  if (appMenu) {
    const homeItem = appMenu.getMenuItemById(HistoryItemId.HOME);
    if (homeItem) {
      homeItem.visible = !!homeUrl;
    }

    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
      const backItem = appMenu.getMenuItemById(HistoryItemId.BACK);
      if (backItem) {
        backItem.enabled = focusedWindow.webContents.canGoBack();
      }

      const forwardItem = appMenu.getMenuItemById(HistoryItemId.FORWARD);
      if (forwardItem) {
        forwardItem.enabled = focusedWindow.webContents.canGoForward();
      }
    }
  }
};


/**
 * Set the home URL for the application.
 * @param  {string} url The URL.
 */
const setHomeUrl = (url) => {
  homeUrl = url;
  updateHistoryMenu();
};


module.exports = {createAppMenu, setHomeUrl, updateHistoryMenu};
