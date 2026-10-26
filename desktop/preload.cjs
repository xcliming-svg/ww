const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('wwDesktop', {
  readSave: (/** @type {boolean} */ backup) => ipcRenderer.invoke('save:read', backup),
  writeSave: (/** @type {string} */ raw, /** @type {boolean} */ preserveOriginal) => ipcRenderer.invoke('save:write', raw, preserveOriginal),
  quit: () => ipcRenderer.invoke('app:quit'),
  onClose: (/** @type {()=>void} */ callback) => {
    const listener = () => callback(); ipcRenderer.on('app:close-request', listener);
    return () => ipcRenderer.removeListener('app:close-request', listener);
  }
});
