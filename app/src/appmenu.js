const {app, BrowserWindow} = require('electron');

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
    accelerator: (function() {
      return process.platform === 'darwin' ? 'Ctrl+Command+F' : 'F11';
    })(),
    click: function(item, focusedWindow) {
      if (focusedWindow) {
        focusedWindow.setFullScreen(!focusedWindow.isFullScreen());
      }
    }
  }]
};

if (!app.isPackaged) {
  viewMenu.submenu.push({
    label: 'Toggle Developer Tools',
    accelerator: (function() {
      return process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I';
    })(),
    click: function(item, focusedWindow) {
      if (focusedWindow) {
        focusedWindow.toggleDevTools();
      }
    }
  });
}

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

let template = [editMenu, viewMenu, windowMenu];

if (process.platform === 'darwin') {
  const name = app.getName();
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

  let windowMenu = template.find(function(item) {
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

module.exports = template;
