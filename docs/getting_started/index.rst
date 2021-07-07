Getting Started
###############

Running Locally
***************

- Clone this repository alongside `OpenSphere`_ in a `Yarn workspace`_.
- Clone `opensphere-config-electron`_ to the workspace, which provides the Electron version and config overrides.
- Run ``yarn install``.
- Build OpenSphere.
- From ``opensphere-electron``, run ``yarn start`` to launch the compiled app or ``yarn start --dev`` to launch the dev app.

.. _OpenSphere: https://github.com/ngageoint/opensphere
.. _Yarn workspace: https://github.com/ngageoint/opensphere-yarn-workspace
.. _opensphere-config-electron: https://github.com/ngageoint/opensphere-config-electron

Creating Installers
*******************

Setup
-----

Prior to creating installers, please look at the `Multi Platform Build`_ instructions for ``electron-builder``. You may have to install additional dependencies on your system before it will work, particularly for cross-platform builds.

.. _Multi Platform Build: https://www.electron.build/multi-platform-build

Node Scripts
------------

To generate installers for all supported operating systems and platforms, use ``yarn run create-installers``. To generate OS-specific application installers for Linux, macOS, or Windows, run one of the following:

* Linux: ``yarn run create-installer:linux``
* macOS: ``yarn run create-installer:mac``
* Windows: ``yarn run create-installer:win``

To generate the application package without bundling it into an installer (for debugging purposes), pass ``--dir`` to any of the above scripts.

Electron Builder Configuration
------------------------------

The configuration used to create the installers is in `electron-builder.yml`_. To create installers with a different configuration, provide it to the above scripts with ``-c /path/to/config.yml``. Electron Builder accepts both YML and JSON config files.

For more details on Electron Builder configuration options, see `the documentation`_.

.. _electron-builder.yml: https://github.com/ngageoint/opensphere-electron/blob/master/electron-builder.yml
.. _the documentation: https://www.electron.build/configuration/configuration

Electron Version
----------------

The minimum supported versions of the ``electron`` and ``electron-builder`` packages are defined in the ``peerDependencies`` of ``opensphere-electron/package.json``. The current recommended package versions are defined in ``opensphere-config-electron/package.json``.

If you would like to use your own versions of these packages, either make local modifications in ``opensphere-config-electron`` or create your own fork of the project.

Code Signing
------------

Electron Builder supports `code signing`_ on both macOS and Windows.

On macOS, it will look for developer certificates in the user/system keychain. Install certificates with Xcode and the build will pick them up automatically.

Windows code signing details are still in progress.

.. _code signing: https://www.electron.build/code-signing

Troubleshooting
***************

Unresolved node modules (Yarn workspace)
----------------------------------------

In a Yarn workspace, Electron Builder will fail to resolve npm dependencies from a hoisted ``node_modules`` folder. This will happen when creating installers, and can be worked around by running ``npm install`` from the ``opensphere-electron`` directory to install its dependencies locally. The bug is documented in `electron-builder #2222`_ and should be fixed in the Electron 2.0 release.

.. _electron-builder #2222: https://github.com/electron-userland/electron-builder/issues/2222

Can't create Linux installer on macOS
-------------------------------------

On macOS, creating the Linux installer may fail with an error related to ``appimagetool``. If this happens, try installing ``glib`` with Homebrew. This is `discussed here`_ and will hopefully be fixed in ``electron-builder`` at some point in the future.

For now, install Homebrew and Xcode then run ``brew install glib``.

.. _discussed here: https://github.com/electron-userland/electron-builder/issues/2204#issuecomment-336741074

Custom Mirrors and Caches
*************************

Mirror
------

If you need to use a custom mirror for Electron resources, you can set a couple environment variables when creating installers. Electron composes the download URL with the following:

.. code-block:: javascript

  url = ELECTRON_MIRROR + ELECTRON_CUSTOM_DIR + '/' + ELECTRON_CUSTOM_FILENAME;

Cache
-----

You can also override the cache by putting required files in the following locations:

* Linux: ``$XDG_CACHE_HOME`` or ``~/.cache/electron/``
* MacOS: ``~/Library/Caches/electron/``
* Windows: ``$LOCALAPPDATA/electron/Cache`` or ``~/AppData/Local/electron/Cache/``
