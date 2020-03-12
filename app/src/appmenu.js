// Node Modules
const isDev = require('electron-is-dev');

// Electron Modules
const {app, BrowserWindow, Menu} = require('electron');

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

const historyMenu = {
  label: 'History',
  submenu: [{
    label: 'Home',
    accelerator: process.platform === 'darwin' ? 'Command+Shift+H' : 'Alt+Home',
    click: function(item, focusedWindow) {
      if (focusedWindow && homeUrl) {
        focusedWindow.loadURL(homeUrl);
      }
    }
  }, {
    label: 'Back',
    accelerator: process.platform === 'darwin' ? 'Command+Left' : 'Alt+Left',
    click: function(item, focusedWindow) {
      if (focusedWindow && focusedWindow.webContents) {
        focusedWindow.webContents.goBack();
      }
    }
  }, {
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
 * Update the application menu.
 */
const updateAppMenu = () => {
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
};


/**
 * Set the home URL for the application.
 * @param  {string} url The URL.
 */
const setHomeUrl = (url) => {
  homeUrl = url;
};


module.exports = {updateAppMenu, setHomeUrl};
