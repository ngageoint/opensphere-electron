const {webFrame} = require('electron');

// allow the file:// protocol to be used by the fetch API
webFrame.registerURLSchemeAsPrivileged('file');
