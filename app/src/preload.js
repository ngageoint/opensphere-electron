// allow the file:// protocol to be used by the fetch API
require('electron').webFrame.registerURLSchemeAsPrivileged('file');
