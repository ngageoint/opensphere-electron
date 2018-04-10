App Configuration
#################

The main Electron process uses the `config`_ NPM module to load its configuration. See the `Configuration Files`_ guide on how to customize configuration for different deployments/environments.

The app configuration is currently fairly minimal, but allows controlling things like the application name and the release URL for portable Windows builds (that do not support auto update).

.. _config: https://www.npmjs.com/package/config
.. _Configuration Files: https://github.com/lorenwest/node-config/wiki/Configuration-Files

Customizing Config for Your App
*******************************

To provide a custom app configuration, create a project with an ``electron-builder.yml`` and a ``default.json``.

.. literalinclude:: electron-builder.yml
  :caption: Custom electron-builder configuration
  :linenos:
  :language: yaml
  :emphasize-lines: 4-7

The ``productName`` key will be used in creating the installer file names, and the ``files`` config will copy in the custom settings file along with code to run the app and the OpenSphere distribution. Paths are relative to the ``opensphere-electron`` directory. If you wish to change how platform-specific installers are built, see the `Electron Builder`_ documentation.

.. _Electron Builder: https://www.electron.build/

.. literalinclude:: default.json
  :caption: Custom app configuration
  :linenos:
  :language: json

The ``electron.appName`` key will be used to replace the value returned by ``app.getName()`` in Electron, and the ``electron.releaseUrl`` will be launched if users wish to update a portable Windows build. Non-portable (installed) applications can be updated automatically by configuring Electron Builder's `auto update`_.

.. _auto update: https://www.electron.build/auto-update
