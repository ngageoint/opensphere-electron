# OpenSphere Electron

[OpenSphere](https://github.com/ngageoint/opensphere) is typically deployed as a web application and loaded through a web browser, but some users may prefer to run it as a desktop application. [Electron](https://electronjs.org/) is a framework that allows OpenSphere to be bundled into a cross-platform desktop application.

Bundling OpenSphere into an Electron container provides a number of advantages over loading it with a web browser:

- More data can be loaded due to increased memory constraints.
- More servers can be used because CORS configuration is not required for access.
- A portable version can be used in environments with restricted user permissions (no modern web browser available and/or can't install software).

## Documentation

For details on how to use this project, check out our guides at [opensphere-electron.readthedocs.io](https://opensphere-electron.readthedocs.io).
