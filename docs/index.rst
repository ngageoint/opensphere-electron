OpenSphere Electron
===================

`OpenSphere`_ is typically deployed as a web application and loaded through a web browser, but some users may prefer to run it as a desktop application. `Electron`_ is a framework that allows OpenSphere to be bundled into a cross-platform desktop application.

Bundling OpenSphere into an Electron container provides a number of advantages over loading it with a web browser:

* More data can be loaded due to increased memory constraints.
* More servers can be used because CORS configuration is not required for access.
* A portable version can be used in environments with restricted user permissions (no modern web browser available and/or can't install software).
* Direct file system access, so there is no need to copy files into browser storage.

The code is open source, and `available on GitHub`_.

.. _Electron: https://electronjs.org/
.. _OpenSphere: https://github.com/ngageoint/opensphere
.. _available on GitHub: https://github.com/ngageoint/opensphere-electron

.. _dev-docs:

.. toctree::
   :maxdepth: 2
   :caption: Developer Documentation

   contributing
   getting_started/index
   app_configuration/index
