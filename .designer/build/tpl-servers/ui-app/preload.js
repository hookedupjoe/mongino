const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  getPort: function(){
    return process.env.PORT || '33462';
  },
  runAPI: (theName,theType, theOptions) => ipcRenderer.invoke('api',theName, theType, theOptions),
  setTitle: function(title){
    ipcRenderer.send('set-title', title);
 }
})