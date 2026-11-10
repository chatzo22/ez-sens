const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('ezsensDesktop', {
  get: () => ipcRenderer.invoke('ezsens:get'),
  setUnlock: (on) => ipcRenderer.invoke('ezsens:setUnlock', !!on),
  toggleFullscreen: () => ipcRenderer.invoke('ezsens:fullscreen')
});
