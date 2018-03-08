# OpenSphere Electron

Run OpenSphere in an Electron container.

## Running Locally

- Clone this repository alongside [OpenSphere](https://github.com/ngageoint/opensphere) in a [Yarn workspace](https://github.com/ngageoint/opensphere-yarn-workspace).
- Clone [opensphere-config-electron](https://github.com/ngageoint/opensphere-config-electron) to the workspace for Electron config overrides.
- Run `yarn install`.
- Build OpenSphere.
- From `opensphere-electron`, run `yarn start` to launch the compiled app or `yarn start --debug` to launch the debug app.

## Creating Installers

To generate installers for all supported operating systems and platforms, use `yarn run create-installers`. To generate OS-specific application installers for Linux, macOS, or Windows, run one of the following:

- Linux: `yarn run create-installer:linux`
- macOS: `yarn run create-installer:mac`
- Windows: `yarn run create-installer:win`

To generate the application package without bundling it into an installer (for debugging purposes), pass `--dir` to any of the above scripts.

### Electron Builder Configuration

The configuration used to create the installers is in `electron-builder.yml`. To create installers with a different configuration, provide it to the above scripts with `--config /path/to/config.yml`. Electron Builder accepts both YML and JSON config files.

For more details on Electron Builder configuration options, see [the documentation](https://www.electron.build/configuration/configuration).

### App Configuration

The main Electron process will attempt to load configuration from `config/settings.json`. This currently only supports changing the application name, but in the future will support loading a full configuration file for an OpenSphere deployment.

To change the application name, create a project with a `electron-builder.yml` and a `settings.json` that contain the following:

`electron-builder.yml`:

The `productName` key will be used in creating the installer file names, and the `files` config will copy in the custom settings file. Paths are relative to the `opensphere-electron` directory. Note that a full configuration is required, and this only shows the particular keys necessary to customize the app.

```
productName: My OpenSphere App
files:
  - from: ../my-custom-electron-project
    to: config
    filter:
      - 'settings.json'
```

`settings.json`:

The `appName` key will be used to replace the value returned by `app.getName()` in Electron.

```
{
  "appName": "My OpenSphere App"
}
```

### Code Signing

Electron Builder supports [code signing](https://www.electron.build/code-signing) on both macOS and Windows.

On macOS, it will look for developer certificates in the user/system keychain. Install certificates with Xcode and the build should pick them up automatically.

Windows code signing details are still in progress.

## Troubleshooting

### Unresolved node modules (Yarn workspace)

In a Yarn workspace, Electron Builder will fail to resolve npm dependencies from a hoisted `node_modules` folder. This will happen when creating installers, and can be worked around by running `npm install` from the `opensphere-electron` directory to install its dependencies locally. The bug is [documented here](https://github.com/electron-userland/electron-builder/issues/2222).

### Can't create Linux installer on macOS

On macOS, creating the Linux installer may fail with an error related to `appimagetool`. If this happens, try installing `glib` with Homebrew. This is [discussed here](https://github.com/electron-userland/electron-builder/issues/2204#issuecomment-336741074) and will hopefully be fixed in `electron-builder` at some point in the future.

For now, install Homebrew and Xcode then run `brew install glib`.
