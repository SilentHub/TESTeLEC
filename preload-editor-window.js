const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("editorAPI", {
  // Запрашиваем данные у главного процесса
  getInitialData: () => ipcRenderer.invoke("get-editor-initial-data"),

  // Отправка данных в главный процесс
  saveDataAndRefresh: (profileData) =>
    ipcRenderer.invoke("save-data-and-refresh", profileData),

  // Работа с файлами
  showOpenImageDialog: () => ipcRenderer.invoke("dialog:showOpenImageDialog"),
  copyImageToApp: (sourceFilePath) =>
    ipcRenderer.invoke("copy-image-to-app", sourceFilePath),
  deleteAppImage: (fileName) =>
    ipcRenderer.invoke("delete-app-image", fileName),
});
