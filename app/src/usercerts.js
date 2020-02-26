const Promise = require('bluebird');
const {ipcMain} = require('electron');


/**
 * Map of request origin to Promise.
 * @type {Object<string, !Promise>}
 */
const promises = {};


/**
 * Get the user certificate to use for the provided URL.
 * @param {string} url The URL.
 * @param {Array<Certificate>} list Available user certificates.
 * @param {WebContents} webContents The WebContents instance requesting a certificate.
 * @return {Promise} A promise that resolves to the selected certificate.
 */
const getUserCertForUrl = (url, list, webContents) => {
  if (!url) {
    return Promise.reject(new Error('URL for certificate request was empty.'));
  }

  if (!promises[url]) {
    promises[url] = new Promise((resolve, reject) => {
      const callback = (event, eventUrl, cert) => {
        if (eventUrl === url) {
          ipcMain.removeListener('client-certificate-selected', callback);
          resolve(cert);
        }
      };

      ipcMain.on('client-certificate-selected', callback);
      webContents.send('select-client-certificate', url, list);
    });
  }

  return promises[url];
};


module.exports = {getUserCertForUrl};
