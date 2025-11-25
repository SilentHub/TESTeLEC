const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const USER_DATA_PATH = app.getPath("userData");
const PROFILES_DIR_NAME = "profiles";
const IMAGES_DIR_NAME = "phrase_images";
const PROFILES_MANIFEST_FILE = "profiles.json";
const profilesManifestPath = path.join(USER_DATA_PATH, PROFILES_MANIFEST_FILE);
const profilesDirPath = path.join(USER_DATA_PATH, PROFILES_DIR_NAME);

let mainWindow;
let phraseEditorWindow = null;
let stepEditorWindow = null;
let editorInitialData = null;
let playerInitialData = null;

// Коллекции для независимых окон
let sayWindows = new Set();
let playerWindows = new Set(); // <-- НОВАЯ КОЛЛЕКЦИЯ ДЛЯ ПЛЕЕРОВ

// Хранилище настроек для окна SAY
let sayWindowState = { width: 600, height: 400, fontSize: 1.0 };

function ensureAppDirsExist() {
  if (!fs.existsSync(profilesDirPath))
    fs.mkdirSync(profilesDirPath, { recursive: true });
  const imagesPath = path.join(USER_DATA_PATH, IMAGES_DIR_NAME);
  if (!fs.existsSync(imagesPath)) fs.mkdirSync(imagesPath, { recursive: true });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  });
  mainWindow.loadFile("index.html");
  // mainWindow.webContents.openDevTools();
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function createPhrasePopupWindow(phraseDetails) {
  const newSayWindow = new BrowserWindow({
    width: sayWindowState.width,
    height: sayWindowState.height,
    useContentSize: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload-phrase.js"),
      contextIsolation: true,
    },
  });
  sayWindows.add(newSayWindow);
  newSayWindow.setMenu(null);
  newSayWindow.loadFile(path.join(__dirname, "phrase-display.html"));
  newSayWindow.once("ready-to-show", () => {
    if (!newSayWindow.isDestroyed()) {
      newSayWindow.show();
      phraseDetails.fontSize = sayWindowState.fontSize;
      newSayWindow.webContents.send("set-phrase-details", phraseDetails);
    }
  });
  newSayWindow.on("close", () => {
    const bounds = newSayWindow.getBounds();
    sayWindowState.width = bounds.width;
    sayWindowState.height = bounds.height;
  });
  newSayWindow.on("closed", () => {
    sayWindows.delete(newSayWindow);
  });
}

function createPhraseEditorWindow() {
  if (phraseEditorWindow && !phraseEditorWindow.isDestroyed()) {
    phraseEditorWindow.focus();
    return;
  }
  phraseEditorWindow = new BrowserWindow({
    width: 580,
    height: 640,
    useContentSize: true,
    parent: mainWindow,
    modal: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload-editor-window.js"),
      contextIsolation: true,
    },
  });
  phraseEditorWindow.setMenu(null);
  phraseEditorWindow.loadFile(
    path.join(__dirname, "phrase-editor-window.html"),
  );
  phraseEditorWindow.once("ready-to-show", () => {
    phraseEditorWindow.show();
  });
  phraseEditorWindow.on("closed", () => {
    phraseEditorWindow = null;
    editorInitialData = null;
  });
}

function createStepEditorWindow() {
  if (stepEditorWindow && !stepEditorWindow.isDestroyed()) {
    stepEditorWindow.focus();
    return;
  }
  stepEditorWindow = new BrowserWindow({
    width: 700,
    height: 620,
    useContentSize: true,
    parent: mainWindow,
    modal: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload-editor-window.js"),
      contextIsolation: true,
    },
  });
  stepEditorWindow.setMenu(null);
  stepEditorWindow.loadFile(path.join(__dirname, "step-editor-window.html"));
  stepEditorWindow.once("ready-to-show", () => {
    stepEditorWindow.show();
  });
  stepEditorWindow.on("closed", () => {
    stepEditorWindow = null;
    editorInitialData = null;
  });
}

// --- ОБНОВЛЕННАЯ ФУНКЦИЯ СОЗДАНИЯ ПЛЕЕРА ---
function createPlayerWindow() {
  // Убрали проверку на существующее окно, всегда создаем новое
  const newPlayerWindow = new BrowserWindow({
    width: 800,
    height: 550,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload-player.js"),
      contextIsolation: true,
    },
  });

  playerWindows.add(newPlayerWindow); // Добавляем в коллекцию

  newPlayerWindow.loadFile(path.join(__dirname, "player-window.html"));
  newPlayerWindow.once("ready-to-show", () => newPlayerWindow.show());
  newPlayerWindow.on("closed", () => {
    playerWindows.delete(newPlayerWindow); // Удаляем из коллекции при закрытии
  });
}

app.whenReady().then(() => {
  ensureAppDirsExist();
  createMainWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    sayWindows.forEach((win) => win.close());
    playerWindows.forEach((win) => win.close()); // Закрываем все плееры
    app.quit();
  }
});

// --- IPC ОБРАБОТЧИКИ ---

ipcMain.on("open-phrase-editor-window", (event, data) => {
  editorInitialData = data;
  createPhraseEditorWindow();
});
ipcMain.on("open-step-editor-window", (event, data) => {
  editorInitialData = data;
  createStepEditorWindow();
});
ipcMain.on("open-player-window", (event, data) => {
  playerInitialData = data;
  createPlayerWindow();
});
ipcMain.handle("get-editor-initial-data", () => editorInitialData);
ipcMain.handle("get-player-initial-data", () => playerInitialData);
ipcMain.on("save-font-size", (event, size) => {
  if (typeof size === "number") sayWindowState.fontSize = size;
});

ipcMain.handle("delete-profile-file", async (event, profileInfo) => {
  if (!profileInfo || !profileInfo.fileName) {
    return { error: "Некорректная информация о профиле для удаления файла." };
  }
  const profileFilePath = path.join(profilesDirPath, profileInfo.fileName);
  try {
    if (fs.existsSync(profileFilePath)) {
      fs.unlinkSync(profileFilePath);
    }
    return { success: true };
  } catch (error) {
    console.error(`Ошибка удаления файла ${profileInfo.fileName}:`, error);
    return { error: error.message };
  }
});

ipcMain.handle("save-data-and-refresh", async (event, profileData) => {
  if (!profileData || !profileData.id)
    return { error: "Нет данных для сохранения." };
  try {
    const profilesList = JSON.parse(
      fs.readFileSync(profilesManifestPath, "utf-8") || "[]",
    );
    const profileInfo = profilesList.find((p) => p.id === profileData.id);
    if (!profileInfo) return { error: `Профиль ${profileData.id} не найден.` };
    const profileFilePath = path.join(profilesDirPath, profileInfo.fileName);
    fs.writeFileSync(
      profileFilePath,
      JSON.stringify(profileData, null, 2),
      "utf-8",
    );
    mainWindow.webContents.send("data-updated-need-refresh", profileData);
    return { success: true };
  } catch (error) {
    return { error: `Ошибка сохранения: ${error.message}` };
  }
});

ipcMain.handle("save-profile-data", async (event, profileData) => {
  if (!profileData || !profileData.id)
    return { error: "Нет данных для сохранения." };
  try {
    const profilesList = JSON.parse(
      fs.readFileSync(profilesManifestPath, "utf-8") || "[]",
    );
    const profileInfo = profilesList.find((p) => p.id === profileData.id);
    if (!profileInfo) return { error: `Профиль ${profileData.id} не найден.` };
    const profileFilePath = path.join(profilesDirPath, profileInfo.fileName);
    fs.writeFileSync(
      profileFilePath,
      JSON.stringify(profileData, null, 2),
      "utf-8",
    );
    return { success: true };
  } catch (error) {
    return { error: `Ошибка сохранения: ${error.message}` };
  }
});

function countItemsRecursive(folder) {
  let count = (folder.phrases?.length || 0) + (folder.scenarios?.length || 0);
  if (folder.children?.length > 0) {
    for (const child of folder.children) count += countItemsRecursive(child);
  }
  return count;
}

ipcMain.handle("load-profiles-list", async () => {
  try {
    if (!fs.existsSync(profilesManifestPath)) return [];
    const profilesList = JSON.parse(
      fs.readFileSync(profilesManifestPath, "utf-8") || "[]",
    );
    return profilesList.map((profileInfo) => {
      let itemCount = 0;
      const profileFilePath = path.join(profilesDirPath, profileInfo.fileName);
      if (fs.existsSync(profileFilePath)) {
        try {
          const fileContent = fs.readFileSync(profileFilePath, "utf-8");
          if (fileContent.trim()) {
            const profileData = JSON.parse(fileContent);
            itemCount = countItemsRecursive(profileData);
          }
        } catch (e) {
          console.error(
            `Ошибка чтения или подсчета для файла ${profileInfo.fileName}:`,
            e,
          );
        }
      }
      return { ...profileInfo, itemCount };
    });
  } catch (error) {
    return { error: `Ошибка загрузки списка профилей: ${error.message}` };
  }
});

ipcMain.handle("load-profile-data", async (event, profileInfo) => {
  if (!profileInfo || !profileInfo.fileName)
    return { error: "Некорректная инфо о профиле." };
  const profileFilePath = path.join(profilesDirPath, profileInfo.fileName);
  try {
    if (fs.existsSync(profileFilePath)) {
      const fileData = fs.readFileSync(profileFilePath, "utf-8");
      if (!fileData.trim())
        return {
          id: profileInfo.id,
          name: profileInfo.name,
          type: "profile",
          children: [],
        };
      return JSON.parse(fileData);
    }
    return {
      id: profileInfo.id,
      name: profileInfo.name,
      type: "profile",
      children: [],
    };
  } catch (error) {
    return { error: `Ошибка загрузки профиля: ${error.message}` };
  }
});
ipcMain.handle("save-profiles-list", async (event, profilesListData) => {
  try {
    fs.writeFileSync(
      profilesManifestPath,
      JSON.stringify(profilesListData, null, 2),
      "utf-8",
    );
    return { success: true };
  } catch (error) {
    return { error: `Ошибка сохранения списка: ${error.message}` };
  }
});
ipcMain.handle(
  "update-profile-name-in-file",
  async (event, profileInfo, newName) => {
    if (!profileInfo || !profileInfo.fileName || !newName)
      return { error: "Недостаточно данных." };
    const profileFilePath = path.join(profilesDirPath, profileInfo.fileName);
    try {
      if (fs.existsSync(profileFilePath)) {
        const fileData = fs.readFileSync(profileFilePath, "utf-8");
        const profileData = JSON.parse(fileData);
        profileData.name = newName;
        fs.writeFileSync(
          profileFilePath,
          JSON.stringify(profileData, null, 2),
          "utf-8",
        );
        return { success: true };
      } else {
        return { error: `Файл профиля не найден.` };
      }
    } catch (error) {
      return { error: `Ошибка обновления файла: ${error.message}` };
    }
  },
);
ipcMain.on("show-phrase-window", async (event, phraseDetails) => {
  const imagesStoragePath = path.join(USER_DATA_PATH, IMAGES_DIR_NAME);
  let imageAsDataUrl = null;
  if (phraseDetails && phraseDetails.imageFileName) {
    const imageFullPath = path.join(
      imagesStoragePath,
      phraseDetails.imageFileName,
    );
    if (fs.existsSync(imageFullPath)) {
      try {
        const imageBuffer = fs.readFileSync(imageFullPath);
        let mimeType = "image/jpeg";
        const ext = path.extname(phraseDetails.imageFileName).toLowerCase();
        if (ext === ".png") mimeType = "image/png";
        else if (ext === ".gif") mimeType = "image/gif";
        else if (ext === ".webp") mimeType = "image/webp";
        imageAsDataUrl = `data:${mimeType};base64,${imageBuffer.toString("base64")}`;
      } catch (err) {
        console.error("Ошибка чтения файла SAY:", err);
      }
    }
  }
  createPhrasePopupWindow({ ...phraseDetails, imageAsDataUrl });
});
ipcMain.handle("dialog:showOpenImageDialog", async () => {
  const targetWindow = BrowserWindow.getFocusedWindow();
  if (!targetWindow) return null;
  const result = await dialog.showOpenDialog(targetWindow, {
    title: "Выберите изображение для фразы",
    properties: ["openFile"],
    filters: [
      { name: "Images", extensions: ["jpg", "jpeg", "png", "gif", "webp"] },
    ],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const filePath = result.filePaths[0];
  try {
    const imageBuffer = fs.readFileSync(filePath);
    let mimeType = "image/jpeg";
    const ext = path.extname(filePath).toLowerCase();
    if (ext === ".png") mimeType = "image/png";
    else if (ext === ".gif") mimeType = "image/gif";
    else if (ext === ".webp") mimeType = "image/webp";
    return {
      filePath: filePath,
      dataUrl: `data:${mimeType};base64,${imageBuffer.toString("base64")}`,
    };
  } catch (err) {
    return { filePath: filePath, dataUrl: null };
  }
});
ipcMain.handle("copy-image-to-app", async (event, sourceFilePath) => {
  if (!sourceFilePath || !fs.existsSync(sourceFilePath))
    return { error: "Исходный файл не найден" };
  try {
    const imagesDir = path.join(USER_DATA_PATH, IMAGES_DIR_NAME);
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }
    const fileExtension = path.extname(sourceFilePath);
    const randomBytes = crypto.randomBytes(8).toString("hex");
    const newFileName = `${Date.now()}_${randomBytes}${fileExtension}`;
    const destinationPath = path.join(imagesDir, newFileName);
    fs.copyFileSync(sourceFilePath, destinationPath);
    return { success: true, fileName: newFileName };
  } catch (err) {
    return { error: `Ошибка копирования изображения: ${err.message}` };
  }
});
ipcMain.handle("delete-app-image", async (event, fileNameToDelete) => {
  if (!fileNameToDelete) return { error: "Имя файла не указано" };
  try {
    const imagesDir = path.join(USER_DATA_PATH, IMAGES_DIR_NAME);
    const filePathToDelete = path.join(imagesDir, fileNameToDelete);
    if (fs.existsSync(filePathToDelete)) {
      fs.unlinkSync(filePathToDelete);
    }
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
});
