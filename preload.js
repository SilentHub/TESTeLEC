const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // preload.js -> electronAPI
  openPlayerWindow: (data) => ipcRenderer.send("open-player-window", data),
  // Методы для работы со списком и данными профилей
  loadProfilesList: () => ipcRenderer.invoke("load-profiles-list"),
  loadProfileData: (profileInfo) =>
    ipcRenderer.invoke("load-profile-data", profileInfo),
  saveProfileData: (profileData) =>
    ipcRenderer.invoke("save-profile-data", profileData),
  saveProfilesList: (profilesList) =>
    ipcRenderer.invoke("save-profiles-list", profilesList),
  openPhraseEditorWindow: (data) =>
    ipcRenderer.send("open-phrase-editor-window", data),
  onDataUpdated: (callback) =>
    ipcRenderer.on("data-updated-need-refresh", callback),
  deleteProfileFile: (profileInfo) =>
    ipcRenderer.invoke("delete-profile-file", profileInfo),

  // НОВАЯ ФУНКЦИЯ, КОТОРУЮ МЫ ЗАБЫЛИ ДОБАВИТЬ
  updateProfileNameInFile: (profileInfo, newName) =>
    ipcRenderer.invoke("update-profile-name-in-file", profileInfo, newName),
  // preload.js -> electronAPI
  openStepEditorWindow: (data) =>
    ipcRenderer.send("open-step-editor-window", data),
  // Методы для работы с окнами и файлами
  showPhraseInNewWindow: (phraseDetails) =>
    ipcRenderer.send("show-phrase-window", phraseDetails),
  copyImageToApp: (sourceFilePath) =>
    ipcRenderer.invoke("copy-image-to-app", sourceFilePath),
  deleteAppImage: (fileName) =>
    ipcRenderer.invoke("delete-app-image", fileName),
  showOpenImageDialog: () => ipcRenderer.invoke("dialog:showOpenImageDialog"),
});
