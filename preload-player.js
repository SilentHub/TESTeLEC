const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("playerAPI", {
  // Запрашиваем данные для плеера у главного процесса
  getInitialData: () => ipcRenderer.invoke("get-player-initial-data"),
});
