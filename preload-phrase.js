// Файл: preload-phrase.js

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronPhraseWindowAPI", {
  // Получаем данные для отображения
  onSetPhraseDetails: (callback) =>
    ipcRenderer.on("set-phrase-details", callback),

  // Отправляем данные о новом размере шрифта на сохранение
  saveFontSize: (size) => ipcRenderer.send("save-font-size", size),
});
