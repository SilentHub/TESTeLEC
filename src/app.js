import * as dom from "./dom.js";
import * as handlers from "./handlers.js";
import * as api from "./api.js";
import * as state from "./state.js";
import * as ui from "./ui.js";
import * as modals from "./modals.js";
import * as constants from "./constants.js";
import Sortable from "../node_modules/sortablejs/modular/sortable.esm.js";
//import * as player from "./scenarioPlayer.js";

// --- Инициализация ---
document.addEventListener("DOMContentLoaded", async () => {
  const wasCollapsed = localStorage.getItem("sidebarCollapsed") === "true";
  if (wasCollapsed && dom.sidebarElement) {
    dom.sidebarElement.classList.add("collapsed");
  }
  await loadAndRenderProfilesList();
  setupEventListeners();
  //player.setupPlayerEventListeners();

  document.addEventListener("click", () => ui.hideContextMenu());
});

async function loadAndRenderProfilesList() {
  const result = await api.loadProfilesList();
  if (result && !result.error && Array.isArray(result)) {
    state.setProfilesList(result);
  } else {
    state.setProfilesList([]);
    console.error(
      "Ошибка загрузки списка профилей:",
      result ? result.error : "Неизвестная ошибка",
    );
  }
  ui.renderProfileList();
  const lastProfileId = localStorage.getItem("lastActiveProfileId");
  if (lastProfileId && state.profilesList.find((p) => p.id === lastProfileId)) {
    const success = await handlers.selectProfile(lastProfileId);
    if (success) {
      ui.updateActiveProfileInSidebar();
      ui.renderBreadcrumbs();
      ui.renderFolderContent();
    }
  } else if (state.profilesList.length > 0) {
    const firstNonAdmin =
      state.profilesList.find((p) => p.id !== constants.ADMIN_PROFILE_ID) ||
      state.profilesList[0];
    const success = await handlers.selectProfile(firstNonAdmin.id);
    if (success) {
      ui.updateActiveProfileInSidebar();
      ui.renderBreadcrumbs();
      ui.renderFolderContent();
    }
  } else {
    ui.displayNoProfilesMessage();
  }
}

// --- Навигация ---
export function navigateToPath(pathIdsArray) {
  if (!state.currentProfileInfo) return;
  dom.searchInputElement.value = "";
  state.setSearchViewActive(false);
  state.setViewingScenarioId(null);
  state.setCurrentFolderPathIds(pathIdsArray);
  localStorage.setItem("lastFolderPathIds", JSON.stringify(pathIdsArray));
  ui.renderBreadcrumbs();
  ui.renderFolderContent();
}

// --- Установка обработчиков событий ---
function setupEventListeners() {
  // Профили
  dom.manageProfilesBtn.addEventListener(
    "click",
    modals.openProfileManagementModal,
  );
  dom.closeManageProfilesBtn.addEventListener(
    "click",
    modals.closeProfileManagementModal,
  );
  dom.addNewProfileBtn.addEventListener("click", handlers.handleAddProfile);
  dom.manageProfilesOverlay.addEventListener("click", (e) => {
    if (e.target === dom.manageProfilesOverlay)
      modals.closeProfileManagementModal();
  });

  // Общий промпт
  dom.modalOkBtnElement.onclick = () => {
    if (state.currentCustomModalResolve)
      state.currentCustomModalResolve(dom.modalInputElement.value);
    dom.customPromptOverlay.style.display = "none";
    state.setCurrentCustomModalResolve(null);
  };
  dom.modalCancelBtnElement.onclick = () => {
    if (state.currentCustomModalResolve) state.currentCustomModalResolve(null);
    dom.customPromptOverlay.style.display = "none";
    state.setCurrentCustomModalResolve(null);
  };
  dom.customPromptOverlay.addEventListener("click", (e) => {
    if (e.target === dom.customPromptOverlay) dom.modalCancelBtnElement.click();
  });
  dom.modalInputElement.addEventListener("keydown", (e) => {
    if (e.key === "Enter") dom.modalOkBtnElement.click();
    else if (e.key === "Escape") dom.modalCancelBtnElement.click();
  });

  // Редактор фраз
  dom.cancelPhraseEditorBtn.addEventListener(
    "click",
    modals.closePhraseEditorModal,
  );
  dom.savePhraseBtn.addEventListener("click", handlers.handleSavePhrase);
  dom.phraseEditorModalOverlay.addEventListener("click", (e) => {
    if (e.target === dom.phraseEditorModalOverlay)
      modals.closePhraseEditorModal();
  });

  // Изображения в редакторе фраз
  dom.phraseImageInputTriggerBtn.addEventListener("click", async () => {
    const selectionResult = await api.showOpenImageDialog();
    if (selectionResult && selectionResult.filePath) {
      state.setCurrentPhraseImageSourcePath(selectionResult.filePath);
      state.setImageActionOnSave("UPLOAD_NEW");
      if (dom.noImageTextElement) dom.noImageTextElement.style.display = "none";
      const oldInfo = dom.phraseImagePreviewContainer.querySelector(
        ".existing-image-info",
      );
      if (oldInfo) oldInfo.remove();
      if (selectionResult.dataUrl) {
        dom.phraseImagePreview.src = selectionResult.dataUrl;
        dom.phraseImagePreview.style.display = "block";
      } else {
        const fileNameOnly = selectionResult.filePath.split(/[/\\]/).pop();
        if (dom.noImageTextElement)
          dom.noImageTextElement.textContent = `Выбран: ${ui.escapeHTML(fileNameOnly)}`;
        if (dom.noImageTextElement)
          dom.noImageTextElement.style.display = "block";
        dom.phraseImagePreview.style.display = "none";
      }
      dom.phraseClearImageBtn.style.display = "inline-block";
    }
  });
  dom.phraseClearImageBtn.addEventListener("click", () => {
    state.setCurrentPhraseImageSourcePath(null);
    state.setImageActionOnSave("DELETE_EXISTING");
    dom.phraseImagePreview.src = "#";
    dom.phraseImagePreview.style.display = "none";
    if (dom.noImageTextElement) dom.noImageTextElement.style.display = "block";
    if (dom.noImageTextElement)
      dom.noImageTextElement.textContent = "Нет изображения";
    dom.phraseClearImageBtn.style.display = "none";
    const oldInfo = dom.phraseImagePreviewContainer.querySelector(
      ".existing-image-info",
    );
    if (oldInfo) oldInfo.remove();
    dom.phraseImagePreviewContainer.removeAttribute("data-existing-filename");
  });

  // Модалка выбора типа папки
  if (dom.closeSelectFolderTypeBtn) {
    dom.closeSelectFolderTypeBtn.addEventListener("click", () => {
      if (dom.selectFolderTypeModal)
        dom.selectFolderTypeModal.style.display = "none";
    });
  }

  // Модалка редактора этапов
  dom.cancelStepEditorBtn.addEventListener(
    "click",
    modals.closeStepEditorModal,
  );
  dom.saveStepBtn.addEventListener("click", async () => {
    const success = await handlers.handleSaveStep();
    if (success) {
      ui.renderScenarioEditorView();
    }
  });
  dom.stepEditorModalOverlay.addEventListener("click", (e) => {
    if (e.target === dom.stepEditorModalOverlay) modals.closeStepEditorModal();
  });

  // Основные кнопки
  dom.randomPhraseBtn.addEventListener("click", handlers.handleRandomPhrase);
  dom.searchInputElement.addEventListener("input", handlers.handleSearch);
  dom.addFolderBtn.addEventListener("click", handlers.handleAddFolderClick);
  dom.addPhraseBtn.addEventListener("click", handlers.handleAddPhraseClick);
  dom.addScenarioBtn.addEventListener("click", handlers.handleAddScenarioClick);
  dom.filterFavoritesBtn.addEventListener(
    "click",
    handlers.handleToggleFavoritesFilter,
  );

  // Кнопка сворачивания сайдбара
  if (dom.sidebarToggleBtn) {
    dom.sidebarToggleBtn.addEventListener(
      "click",
      handlers.handleSidebarToggle,
    );
  }
  api.onDataUpdated((_event, updatedProfileData) => {
    if (
      state.currentProfileData &&
      state.currentProfileData.id === updatedProfileData.id
    ) {
      state.setCurrentProfileData(updatedProfileData);
      if (state.isSearchViewActive) {
        handlers.handleSearch();
      } else {
        ui.renderFolderContent();
      }
    }
  });
  // Инициализация Drag-n-Drop
  initDragAndDrop();
}

export function generateId(prefix = "item") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// --- Инициализация Drag-and-Drop ---
function initDragAndDrop() {
  if (!dom.profileListElement) return;
  new Sortable(dom.profileListElement, {
    animation: 150,
    ghostClass: "sortable-ghost",
    onEnd: async (event) => {
      const { oldIndex, newIndex } = event;
      const reorderedProfiles = Array.from(state.profilesList);
      const [draggedItem] = reorderedProfiles.splice(oldIndex, 1);
      reorderedProfiles.splice(newIndex, 0, draggedItem);
      state.setProfilesList(reorderedProfiles);
      await api.saveProfilesList(state.profilesList);
      ui.renderProfileList();
    },
  });
}

export function initPhraseDragAndDrop() {
  if (!dom.phraseListAreaElement) return;

  new Sortable(dom.phraseListAreaElement, {
    animation: 150,
    // Эта функция вызывается, когда ты отпускаешь элемент
    onEnd: async (event) => {
      const { oldIndex, newIndex } = event;
      const folder = handlers.getCurrentFolderObject();
      if (!folder) return;

      // 1. НА ЭКРАНЕ ОДИН СПИСОК, А В ДАННЫХ - ДВА.
      //    Поэтому мы временно "склеиваем" их в один список,
      //    чтобы сортировка работала как для профилей.
      const onScreenList = [
        ...(folder.children || []),
        ...(folder.phrases || []),
      ];

      // 2. ПРОСТАЯ СОРТИРОВКА.
      //    Та же логика, что и у профилей: вырезаем элемент
      //    со старого места и вставляем в новое.
      const [movedItem] = onScreenList.splice(oldIndex, 1);
      onScreenList.splice(newIndex, 0, movedItem);

      // 3. ТЕПЕРЬ "РАСКЛЕИВАЕМ" СПИСОК ОБРАТНО.
      //    Раскладываем отсортированные элементы обратно
      //    в два разных массива: один для папок, другой для фраз.
      folder.children = onScreenList.filter((item) => item.type === "folder");
      folder.phrases = onScreenList.filter((item) => item.type !== "folder");

      // Обновляем порядковый номер у фраз
      folder.phrases.forEach((phrase, index) => {
        phrase.order = index + 1;
      });

      // 4. СОХРАНЯЕМ И ПЕРЕРИСОВЫВАЕМ.
      //    Сохраняем изменения и обновляем список на экране.
      await api.saveProfileData(state.currentProfileData);
      ui.renderFolderContent();
    },
  });
}

export function initActionBlockDragAndDrop() {
  if (!dom.stepActionsListContainer) return;
  new Sortable(dom.stepActionsListContainer, {
    animation: 150,
    onEnd: (event) => {
      const { oldIndex, newIndex } = event;
      const step = state.stepBeingEdited;
      if (!step || !step.actionBlocks) return;

      const [draggedItem] = step.actionBlocks.splice(oldIndex, 1);
      step.actionBlocks.splice(newIndex, 0, draggedItem);
    },
  });
}
// src/app.js -> setupEventListeners()

// src/app.js -> setupEventListeners()

// --- НАЧАЛО БЛОКА С ФУНКЦИОНАЛОМ БЛОКНОТА ---

const appContainer = document.querySelector(".app-container");
const notepadView = document.getElementById("notepad-view");
const notepadTextarea = document.getElementById("notepad-textarea");

let currentFontSize = 1.1; // Начальный размер шрифта, em

const changeFontSize = (amount) => {
  currentFontSize += amount;
  if (currentFontSize < 0.5) currentFontSize = 0.5;
  notepadTextarea.style.fontSize = `${currentFontSize}em`;
};

const fixLayout = (text) => {
  const enToRu = {
    q: "й",
    w: "ц",
    e: "у",
    r: "к",
    t: "е",
    y: "н",
    u: "г",
    i: "ш",
    o: "щ",
    p: "з",
    "[": "х",
    "]": "ъ",
    a: "ф",
    s: "ы",
    d: "в",
    f: "а",
    g: "п",
    h: "р",
    j: "о",
    k: "л",
    l: "д",
    ";": "ж",
    "'": "э",
    z: "я",
    x: "ч",
    c: "с",
    v: "м",
    b: "и",
    n: "т",
    m: "ь",
    ",": "б",
    ".": "ю",
    "/": ".",
    "`": "ё",
    Q: "Й",
    W: "Ц",
    E: "У",
    R: "К",
    T: "Е",
    Y: "Н",
    U: "Г",
    I: "Ш",
    O: "Щ",
    P: "З",
    "{": "Х",
    "}": "Ъ",
    A: "Ф",
    S: "Ы",
    D: "В",
    F: "А",
    G: "П",
    H: "Р",
    J: "О",
    K: "Л",
    L: "Д",
    ":": "Ж",
    '"': "Э",
    Z: "Я",
    X: "Ч",
    C: "С",
    V: "М",
    B: "И",
    N: "Т",
    M: "Ь",
    "<": "Б",
    ">": "Ю",
    "?": ",",
    "~": "Ё",
    "@": '"',
    "#": "№",
    $: ";",
    "^": ":",
    "&": "?",
  };
  const ruToEn = {};
  for (const key in enToRu) {
    ruToEn[enToRu[key]] = key;
  }
  let ruCount = (text.match(/[а-яА-Я]/g) || []).length;
  let enCount = (text.match(/[a-zA-Z]/g) || []).length;
  const conversionMap = ruCount > enCount ? ruToEn : enToRu;
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    result += conversionMap[char] || char;
  }
  return result;
};

// ЗАМЕНИ ЭТОТ ОБРАБОТЧИК ЦЕЛИКОМ
document.addEventListener("keydown", (e) => {
  if (e.key === "Tab") {
    const isNotepadVisible = notepadView.style.display !== "none";
    if (isNotepadVisible) {
      e.preventDefault();
      notepadView.style.display = "none";
      appContainer.style.display = "flex";
    } else {
      if (!e.target.closest("input, textarea")) {
        e.preventDefault();
        notepadView.style.display = "block";
        appContainer.style.display = "none";
        notepadTextarea.focus();
      }
    }
    return;
  }

  const isNotepadVisible = notepadView.style.display !== "none";
  if (isNotepadVisible && e.ctrlKey) {
    // --- ИЗМЕНЕНИЕ ЗДЕСЬ: используем e.code вместо e.key ---
    switch (e.code) {
      case "Equal": // Физическая клавиша для = и +
        e.preventDefault();
        changeFontSize(0.1);
        break;
      case "Minus": // Физическая клавиша для - и _
        e.preventDefault();
        changeFontSize(-0.1);
        break;
      case "KeyS": // Физическая клавиша 'S' (которая 'ы' в русской раскладке)
        e.preventDefault();
        notepadTextarea.value = fixLayout(notepadTextarea.value);
        break;
    }
  }
});

// --- КОНЕЦ БЛОКА С ФУНКЦИОНАЛОМ БЛОКНОТА ---
export function initStepDragAndDrop() {
  const stepsListContainer =
    dom.phraseListAreaElement.querySelector(".steps-list");
  if (!stepsListContainer) return;

  new Sortable(stepsListContainer, {
    animation: 150,
    ghostClass: "sortable-ghost",
    onEnd: async (event) => {
      const { oldIndex, newIndex } = event;
      const scenario = handlers.findScenarioById(state.viewingScenarioId);
      if (!scenario || !scenario.steps) return;

      // Просто сортируем массив этапов
      const [movedStep] = scenario.steps.splice(oldIndex, 1);
      scenario.steps.splice(newIndex, 0, movedStep);

      // Сохраняем и перерисовываем
      await api.saveProfileData(state.currentProfileData);
      ui.renderScenarioEditorView();
    },
  });
}
export function initScenarioDragAndDrop() {
  if (!dom.phraseListAreaElement) return;

  new Sortable(dom.phraseListAreaElement, {
    animation: 150,
    ghostClass: "sortable-ghost",
    onEnd: async (event) => {
      const { oldIndex, newIndex } = event;
      const folder = handlers.getCurrentFolderObject();

      if (!folder || !folder.scenarios) return;

      // Сортируем массив сценариев
      const [movedScenario] = folder.scenarios.splice(oldIndex, 1);
      folder.scenarios.splice(newIndex, 0, movedScenario);

      // Сохраняем и обновляем интерфейс
      await api.saveProfileData(state.currentProfileData);
      ui.renderFolderContent();
    },
  });
}
