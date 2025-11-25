let currentProfileData = null;
let editingPhraseId = null;
let currentFolderPathIds = [];

const dom = {
  title: document.getElementById("phrase-editor-title"),
  nameInput: document.getElementById("phrase-editor-name"),
  phraseTextInput: document.getElementById("phrase-editor-phraseText"),
  transcriptionInput: document.getElementById("phrase-editor-transcription"),
  actionTextInput: document.getElementById("phrase-editor-actionText"),
  saveBtn: document.getElementById("save-btn"),
  cancelBtn: document.getElementById("cancel-btn"),
};

function findFolderByPath(pathIds) {
  if (!currentProfileData) return null;
  let currentLevel = currentProfileData;
  for (const folderId of pathIds) {
    if (!currentLevel.children) return null;
    currentLevel = currentLevel.children.find((f) => f.id === folderId);
    if (!currentLevel) return null;
  }
  return currentLevel;
}

function generateId(prefix = "item") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

async function initialize() {
  const data = await window.editorAPI.getInitialData();
  if (!data) {
    alert("Не удалось загрузить данные для редактора!");
    window.close();
    return;
  }

  currentProfileData = data.profileData;
  editingPhraseId = data.phraseId;
  currentFolderPathIds = data.folderPathIds;
  const parentFolder = findFolderByPath(currentFolderPathIds);

  if (editingPhraseId) {
    const phrase = parentFolder?.phrases?.find((p) => p.id === editingPhraseId);
    if (phrase) {
      dom.title.textContent = "Редактировать фразу";
      dom.nameInput.value = phrase.name || "";
      dom.phraseTextInput.value = phrase.phraseText || "";
      dom.transcriptionInput.value = phrase.transcription || "";
      dom.actionTextInput.value = phrase.actionText || "";
      dom.saveBtn.textContent = "Сохранить";
    }
  } else {
    dom.title.textContent = "Добавить новую фразу";
    dom.saveBtn.textContent = "Добавить";
  }
  dom.nameInput.focus();
}

async function handleSave() {
  if (!currentProfileData) {
    alert("Данные не загружены, сохранение невозможно.");
    return;
  }

  const name = dom.nameInput.value.trim();
  if (!name) {
    alert("Название фразы не может быть пустым.");
    return;
  }

  const parentFolder = findFolderByPath(currentFolderPathIds);
  if (!parentFolder) {
    alert("Критическая ошибка: не найдена родительская папка!");
    return;
  }

  if (editingPhraseId) {
    const phrase = parentFolder.phrases.find((p) => p.id === editingPhraseId);
    if (phrase) {
      phrase.name = name;
      phrase.phraseText = dom.phraseTextInput.value.trim();
      phrase.transcription = dom.transcriptionInput.value.trim();
      phrase.actionText = dom.actionTextInput.value.trim();
      // Убедимся, что поле imageFileName удаляется, если оно было
      delete phrase.imageFileName;
    }
  } else {
    const newPhrase = {
      id: generateId("phrase"),
      name,
      phraseText: dom.phraseTextInput.value.trim(),
      transcription: dom.transcriptionInput.value.trim(),
      actionText: dom.actionTextInput.value.trim(),
      isFavorite: false,
      order: (parentFolder.phrases?.length || 0) + 1,
    };
    if (!parentFolder.phrases) parentFolder.phrases = [];
    parentFolder.phrases.push(newPhrase);
  }

  const result = await window.editorAPI.saveDataAndRefresh(currentProfileData);
  if (result.success) {
    window.close();
  } else {
    alert(`Ошибка сохранения: ${result.error}`);
  }
}

// --- Привязка событий и запуск ---
dom.cancelBtn.addEventListener("click", () => window.close());
document.addEventListener(
  "keydown",
  (e) => e.key === "Escape" && window.close(),
);
dom.saveBtn.addEventListener("click", handleSave);

// Запускаем инициализацию после загрузки всего скрипта
initialize();
