// Этот файл хранит все ссылки на элементы DOM для удобного доступа
export const profileListElement = document.getElementById("profile-list");
export const manageProfilesBtn = document.getElementById("manage-profiles-btn");
export const breadcrumbNavElement = document.getElementById("breadcrumb-nav");
export const searchInputElement = document.getElementById("search-input");
export const phraseListAreaElement =
  document.getElementById("phrase-list-area");
export const randomPhraseBtn = document.getElementById("random-phrase-btn");
export const addFolderBtn = document.getElementById("add-folder-btn");
export const addPhraseBtn = document.getElementById("add-phrase-btn");
export const addScenarioBtn = document.getElementById("add-scenario-btn");

// Модалка пароля
export const passwordPromptOverlay = document.getElementById(
  "password-prompt-overlay",
);
export const passwordModalInput = document.getElementById(
  "password-modal-input",
);
export const passwordModalOkBtn = document.getElementById(
  "password-modal-ok-btn",
);
export const passwordModalCancelBtn = document.getElementById(
  "password-modal-cancel-btn",
);

// Модалка управления профилями
export const manageProfilesOverlay = document.getElementById(
  "manage-profiles-overlay",
);
export const profilesEditorListElement = document.getElementById(
  "profiles-editor-list",
);
export const newProfileNameInput = document.getElementById(
  "new-profile-name-input",
);
export const addNewProfileBtn = document.getElementById("add-new-profile-btn");
export const closeManageProfilesBtn = document.getElementById(
  "close-manage-profiles-btn",
);

// Общий промпт
export const customPromptOverlay = document.getElementById(
  "custom-prompt-overlay",
);
export const modalTitleElement = document.getElementById("modal-title");
export const modalMessageElement = document.getElementById("modal-message");
export const modalInputElement = document.getElementById("modal-input");
export const modalOkBtnElement = document.getElementById("modal-ok-btn");
export const modalCancelBtnElement =
  document.getElementById("modal-cancel-btn");

// Редактор фраз
export const phraseEditorModalOverlay = document.getElementById(
  "phrase-editor-modal-overlay",
);
export const phraseEditorTitle = document.getElementById("phrase-editor-title");
export const phraseEditorNameInput =
  document.getElementById("phrase-editor-name");
export const phraseEditorPhraseTextInput = document.getElementById(
  "phrase-editor-phraseText",
);
export const phraseEditorTranscriptionInput = document.getElementById(
  "phrase-editor-transcription",
);
export const phraseEditorActionTextInput = document.getElementById(
  "phrase-editor-actionText",
);
export const savePhraseBtn = document.getElementById("save-phrase-btn");
export const cancelPhraseEditorBtn = document.getElementById(
  "cancel-phrase-editor-btn",
);
export const phraseImageInputTriggerBtn = document.getElementById(
  "phrase-editor-image-input-trigger",
);
export const phraseImagePreviewContainer = document.getElementById(
  "phrase-image-preview-container",
);
export const phraseImagePreview = document.getElementById(
  "phrase-editor-image-preview",
);
export const phraseClearImageBtn = document.getElementById(
  "phrase-editor-clear-image-btn",
);
export const noImageTextElement = document.getElementById(
  "phrase-editor-no-image-text",
);

// Выбор типа папки
export const selectFolderTypeModal = document.getElementById(
  "select-folder-type-modal-overlay",
);
export const closeSelectFolderTypeBtn = document.getElementById(
  "close-select-folder-type-btn",
);

// Выбор смайликов
export const emojiPickerPopover = document.getElementById(
  "emoji-picker-popover",
);
export const sidebarElement = document.getElementById("sidebar");
export const sidebarToggleBtn = document.getElementById("sidebar-toggle-btn");

// Редактор этапов сценария
export const stepEditorModalOverlay = document.getElementById(
  "step-editor-modal-overlay",
);
export const cancelStepEditorBtn = document.getElementById(
  "cancel-step-editor-btn",
);
export const stepEditorTitle = document.getElementById("step-editor-title");
export const stepEditorNameInput = document.getElementById("step-editor-name");
export const stepEditorDescriptionInput = document.getElementById(
  "step-editor-description",
);
export const saveStepBtn = document.getElementById("save-step-btn");
export const stepActionsPanel = document.getElementById("step-actions-panel");
export const stepActionsListContainer = document.getElementById(
  "step-actions-list-container",
);

// Модальное окно Alert
export const alertModalOverlay = document.getElementById("alert-modal-overlay");
export const alertModalMessage = document.getElementById("alert-modal-message");
export const alertModalOkBtn = document.getElementById("alert-modal-ok-btn");

// Окно подтверждения
export const confirmModalOverlay = document.getElementById(
  "confirm-modal-overlay",
);
export const confirmModalTitle = document.getElementById("confirm-modal-title");
export const confirmModalMessage = document.getElementById(
  "confirm-modal-message",
);
export const confirmModalOkBtn = document.getElementById(
  "confirm-modal-ok-btn",
);
export const confirmModalCancelBtn = document.getElementById(
  "confirm-modal-cancel-btn",
);

// Плеер сценариев
export const scenarioPlayerOverlay = document.getElementById(
  "scenario-player-overlay",
);
export const playerPrevStepBtn = document.getElementById(
  "player-prev-step-btn",
);
export const playerNextStepBtn = document.getElementById(
  "player-next-step-btn",
);
export const playerStepName = document.getElementById("player-step-name");
export const playerStepCounter = document.getElementById("player-step-counter");
export const playerStepDescription = document.getElementById(
  "player-step-description",
);
export const playerActionsList = document.getElementById("player-actions-list");
export const playerCloseBtn = document.getElementById("player-close-btn");

// Контейнер для уведомлений (Toast)
export const toastContainer = document.getElementById("toast-container");

// Контекстное меню
export const contextMenu = document.getElementById("context-menu");

// Фильтр избранного
export const filterFavoritesBtn = document.getElementById(
  "filter-favorites-btn",
);
