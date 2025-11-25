import * as state from "./state.js";
import * as dom from "./dom.js";
import * as api from "./api.js";
import * as ui from "./ui.js";
import * as modals from "./modals.js"; // <-- ВОТ ЭТА СТРОКА, КОТОРОЙ НЕ ХВАТАЛО
import * as constants from "./constants.js";
import { navigateToPath, generateId } from "./app.js";

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ПОИСКА ---
export function getCurrentFolderObject() {
  if (!state.currentProfileData) return null;
  let currentLevel = state.currentProfileData;
  for (const folderId of state.currentFolderPathIds) {
    if (!currentLevel.children || !currentLevel.children.find) return null;
    currentLevel = currentLevel.children.find(
      (folder) => folder.id === folderId,
    );
    if (!currentLevel) return null;
  }
  return currentLevel;
}

export function findPhraseById(phraseId) {
  const folder = getCurrentFolderObject();
  return folder?.phrases?.find((p) => p.id === phraseId) || null;
}

export function findPhraseByIdInSpecificPath(
  phraseId,
  profileId,
  folderPathArray,
) {
  let searchPool = state.currentProfileData;
  if (!searchPool || searchPool.id !== profileId) {
    console.warn("Поиск фразы в неактивном профиле не реализован");
    return null;
  }
  let currentLevel = searchPool;
  for (const folderId of folderPathArray) {
    if (!currentLevel.children || !currentLevel.children.find) return null;
    currentLevel = currentLevel.children.find(
      (folder) => folder.id === folderId,
    );
    if (!currentLevel) return null;
  }
  return currentLevel?.phrases?.find((p) => p.id === phraseId) || null;
}

export function findScenarioById(scenarioId) {
  const folder = getCurrentFolderObject();
  if (
    folder &&
    folder.folderType === constants.FOLDER_TYPE_SCENARIOS &&
    folder.scenarios
  ) {
    return folder.scenarios.find((s) => s.id === scenarioId) || null;
  }
  return null;
}

function findScenarioByStepId(stepId) {
  const currentFolder = getCurrentFolderObject();
  if (!currentFolder || !currentFolder.scenarios) return null;
  for (const scenario of currentFolder.scenarios) {
    if (scenario.steps && scenario.steps.some((s) => s.id === stepId)) {
      return scenario;
    }
  }
  return null;
}

// --- ОСНОВНЫЕ ОБРАБОТЧИКИ ---

export async function selectProfile(profileId) {
  const profileInfoToSelect = state.profilesList.find(
    (p) => p.id === profileId,
  );
  if (!profileInfoToSelect) {
    console.error(`Профиль с ID ${profileId} не найден.`);
    return false;
  }

  if (
    profileInfoToSelect.id === constants.ADMIN_PROFILE_ID &&
    !state.adminAccessGranted
  ) {
    if (!(await modals.promptForAdminPassword())) {
      if (!state.currentProfileInfo)
        ui.displayNoProfilesMessage("Требуется вход в профиль Админ.");
      return false;
    }
    state.setAdminAccessGranted(true);
  }

  dom.phraseListAreaElement.innerHTML =
    '<p class="empty-folder-message">Загрузка данных профиля...</p>';
  const result = await api.loadProfileData(profileInfoToSelect);

  if (result && !result.error) {
    state.setCurrentProfileData(result);
    state.setCurrentProfileInfo(profileInfoToSelect);
    state.setCurrentFolderPathIds([]);
    dom.searchInputElement.value = "";
    state.setSearchViewActive(false);
    state.setViewingScenarioId(null);

    localStorage.setItem("lastActiveProfileId", state.currentProfileInfo.id);
    localStorage.setItem(
      "lastFolderPathIds",
      JSON.stringify(state.currentFolderPathIds),
    );
    return true;
  } else {
    await modals.showToast(
      `Не удалось загрузить данные для профиля "${profileInfoToSelect.name}".`,
    );
    console.error(
      "Ошибка загрузки данных профиля:",
      result ? result.error : "Неизвестная ошибка",
    );
    return false;
  }
}

// --- ОБРАБОТЧИКИ ДЛЯ ПРОФИЛЕЙ ---
export async function handleAddProfile() {
  const newName = dom.newProfileNameInput.value.trim();
  if (!newName) {
    await modals.showToast("Имя профиля не может быть пустым.");
    return false;
  }
  if (
    state.profilesList.some(
      (p) => p.name.toLowerCase() === newName.toLowerCase(),
    )
  ) {
    await modals.showToast("Профиль с таким именем уже существует.");
    return false;
  }
  const newProfileInfo = {
    id: generateId("profile"),
    name: newName,
    emoji: "🙂",
    fileName: `${generateId("profile_file")}.json`,
  };
  const newProfileData = {
    id: newProfileInfo.id,
    name: newName.trim(),
    type: "profile",
    children: [],
  };

  const updatedList = [...state.profilesList, newProfileInfo];
  await api.saveProfilesList(updatedList);
  await api.saveProfileData(newProfileData);

  state.setProfilesList(updatedList);
  ui.renderProfileList();
  ui.renderProfilesForEditing();
  dom.newProfileNameInput.value = "";
  dom.newProfileNameInput.focus();

  await selectProfile(newProfileInfo.id);
  modals.closeProfileManagementModal();
  return true;
}

export async function handleEditProfileNameClick(profileId) {
  const profileInfo = state.profilesList.find((p) => p.id === profileId);
  if (!profileInfo) {
    await modals.showToast("Ошибка: Профиль для редактирования не найден.");
    return;
  }
  const newName = await modals.showGenericPrompt(
    "Редактировать профиль",
    "Новое имя профиля:",
    profileInfo.name,
  );
  if (
    newName === null ||
    newName.trim() === "" ||
    newName.trim().toLowerCase() === profileInfo.name.toLowerCase()
  )
    return;
  if (
    state.profilesList.some(
      (p) =>
        p.id !== profileId &&
        p.name.toLowerCase() === newName.trim().toLowerCase(),
    )
  ) {
    await modals.showToast(
      `Профиль с именем "${newName.trim()}" уже существует.`,
    );
    return;
  }
  profileInfo.name = newName.trim();

  await api.saveProfilesList(state.profilesList);
  await api.updateProfileNameInFile(profileInfo, newName.trim());

  ui.renderProfileList();
  ui.renderProfilesForEditing();
  if (state.currentProfileInfo && state.currentProfileInfo.id === profileId) {
    state.currentProfileInfo.name = newName.trim();
    if (state.currentProfileData)
      state.currentProfileData.name = newName.trim();
    ui.renderBreadcrumbs();
  }
}

export async function handleDeleteProfile(profileIdToDelete) {
  const profileInfo = state.profilesList.find(
    (p) => p.id === profileIdToDelete,
  );
  if (!profileInfo) {
    await modals.showToast("Профиль для удаления не найден.");
    return;
  }
  const confirmation = await modals.showConfirm(
    `Вы уверены, что хотите удалить профиль "${profileInfo.name}"? Все его данные будут потеряны!`,
    "Удаление профиля",
  );

  if (!confirmation) {
    return;
  }

  await api.deleteProfileFile(profileInfo);

  const updatedList = state.profilesList.filter(
    (p) => p.id !== profileIdToDelete,
  );
  state.setProfilesList(updatedList);
  await api.saveProfilesList(state.profilesList);
  ui.renderProfileList();
  ui.renderProfilesForEditing();
  if (
    state.currentProfileInfo &&
    state.currentProfileInfo.id === profileIdToDelete
  ) {
    state.setCurrentProfileData(null);
    state.setCurrentProfileInfo(null);
    state.setCurrentFolderPathIds([]);
    localStorage.removeItem("lastActiveProfileId");
    localStorage.removeItem("lastFolderPathIds");
    if (state.profilesList.length > 0) {
      const nextProfile =
        state.profilesList.find((p) => p.id !== constants.ADMIN_PROFILE_ID) ||
        state.profilesList[0];
      await selectProfile(nextProfile.id);
    } else {
      ui.displayNoProfilesMessage("Все профили удалены.");
    }
  }
}

export async function handleEmojiSelect(profileId, selectedEmoji) {
  const profileInfo = state.profilesList.find((p) => p.id === profileId);
  if (!profileInfo) return;
  profileInfo.emoji = selectedEmoji;
  await api.saveProfilesList(state.profilesList);
  ui.renderProfileList();
  ui.renderProfilesForEditing();
  if (state.currentProfileInfo && state.currentProfileInfo.id === profileId) {
    state.currentProfileInfo.emoji = selectedEmoji;
    ui.renderBreadcrumbs();
  }
}

export function showEmojiPickerForProfile(targetElement, profileId) {
  modals.showEmojiPicker(targetElement, (emoji) =>
    handleEmojiSelect(profileId, emoji),
  );
}

// --- ОБРАБОТЧИКИ ДЛЯ ПАПОК ---
export async function handleAddFolderClick() {
  if (!state.currentProfileInfo || state.isSearchViewActive) {
    await modals.showToast("Нельзя добавить папку в текущем режиме.");
    return;
  }
  const parentFolder = getCurrentFolderObject();
  if (!parentFolder) {
    await modals.showToast("Ошибка: Родительская папка не найдена.");
    return;
  }
  if (
    parentFolder.type === "folder" &&
    parentFolder.folderType !== constants.FOLDER_TYPE_CONTAINER
  ) {
    await modals.showToast(`Нельзя создать подпапку в папке этого типа.`);
    return;
  }
  const selectedType = await modals.promptForFolderType();
  if (!selectedType) return;
  const folderName = await modals.showGenericPrompt(
    "Новая папка",
    `Имя для папки типа "${selectedType}":`,
  );
  if (folderName === null || folderName.trim() === "") return;
  parentFolder.children = parentFolder.children || [];
  if (
    parentFolder.children.some(
      (c) =>
        c.type === "folder" &&
        c.name.toLowerCase() === folderName.trim().toLowerCase(),
    )
  ) {
    await modals.showToast(
      `Папка с именем "${folderName.trim()}" уже существует здесь.`,
    );
    return;
  }
  parentFolder.children.push({
    id: generateId("folder"),
    name: folderName.trim(),
    type: "folder",
    folderType: selectedType,
    children: [],
    phrases: [],
    scenarios: [],
  });
  await api.saveProfileData(state.currentProfileData);
  ui.renderFolderContent();
}

export async function handleEditFolderNameClick(folderId) {
  const parentFolder = getCurrentFolderObject();
  if (!parentFolder?.children) {
    await modals.showToast("Ошибка: Родительская папка не найдена.");
    return;
  }
  const folderToEdit = parentFolder.children.find((f) => f.id === folderId);
  if (!folderToEdit) {
    await modals.showToast("Ошибка: Папка для редактирования не найдена.");
    return;
  }
  const newFolderName = await modals.showGenericPrompt(
    "Редактировать имя папки",
    "Новое имя:",
    folderToEdit.name,
  );
  if (
    newFolderName === null ||
    newFolderName.trim() === "" ||
    newFolderName.trim().toLowerCase() === folderToEdit.name.toLowerCase()
  )
    return;
  if (
    parentFolder.children.some(
      (c) =>
        c.id !== folderId &&
        c.type === "folder" &&
        c.name.toLowerCase() === newFolderName.trim().toLowerCase(),
    )
  ) {
    await modals.showToast(
      `Папка с именем "${newFolderName.trim()}" уже существует.`,
    );
    return;
  }
  folderToEdit.name = newFolderName.trim();
  await api.saveProfileData(state.currentProfileData);
  ui.renderFolderContent();
  ui.renderBreadcrumbs();
}

export async function handleDeleteFolderClick(folderId) {
  const parentFolder = getCurrentFolderObject();
  if (!parentFolder?.children) {
    await modals.showToast("Ошибка: Родительская папка не найдена.");
    return;
  }
  const folderIndex = parentFolder.children.findIndex((f) => f.id === folderId);
  if (folderIndex === -1) {
    await modals.showToast("Ошибка: Папка для удаления не найдена.");
    return;
  }
  const folderToDelete = parentFolder.children[folderIndex];
  const warning =
    folderToDelete.children?.length ||
    folderToDelete.phrases?.length ||
    folderToDelete.scenarios?.length
      ? "Эта папка не пуста. "
      : "";

  const confirmation = await modals.showConfirm(
    `${warning}Удалить папку "${folderToDelete.name}" и всё её содержимое?`,
    "Удаление папки",
  );
  if (!confirmation) return;

  // TODO: Рекурсивное удаление изображений из всех вложенных фраз.
  parentFolder.children.splice(folderIndex, 1);
  await api.saveProfileData(state.currentProfileData);
  const deletedInPathIdx = state.currentFolderPathIds.indexOf(folderId);
  if (deletedInPathIdx !== -1) {
    navigateToPath(state.currentFolderPathIds.slice(0, deletedInPathIdx));
  } else {
    ui.renderFolderContent();
  }
}

// --- ОБРАБОТЧИКИ ДЛЯ ФРАЗ ---
export async function handleCopyText(
  phraseId,
  profileIdToUse = state.currentProfileInfo?.id,
  folderPathToUse = state.currentFolderPathIds,
) {
  const phrase = state.isSearchViewActive
    ? findPhraseByIdInSpecificPath(phraseId, profileIdToUse, folderPathToUse)
    : findPhraseById(phraseId);
  if (phrase && phrase.phraseText) {
    try {
      await navigator.clipboard.writeText(phrase.phraseText);
      await modals.showToast("Текст фразы скопирован!");
    } catch (err) {
      await modals.showToast("Ошибка копирования.");
    }
  } else if (phrase) {
    await modals.showToast("Основной текст этой фразы пуст.");
  }
}
export function handleSayText(
  phraseId,
  profileIdToUse = state.currentProfileInfo?.id,
  folderPathToUse = state.currentFolderPathIds,
) {
  const phrase = state.isSearchViewActive
    ? findPhraseByIdInSpecificPath(phraseId, profileIdToUse, folderPathToUse)
    : findPhraseById(phraseId);
  if (phrase) {
    api.showPhraseInNewWindow({
      name: phrase.name,
      phraseText: phrase.phraseText,
      transcription: phrase.transcription,
      actionText: phrase.actionText,
      imageFileName: phrase.imageFileName,
      emoji: phrase.emoji,
    });
  }
}
export function handleToggleFavorite(
  phraseId,
  btn,
  profileIdToUse = state.currentProfileInfo?.id,
  folderPathToUse = state.currentFolderPathIds,
) {
  const phrase = state.isSearchViewActive
    ? findPhraseByIdInSpecificPath(phraseId, profileIdToUse, folderPathToUse)
    : findPhraseById(phraseId);
  if (phrase) {
    phrase.isFavorite = !phrase.isFavorite;
    const btnToUpdate =
      btn ||
      (state.isSearchViewActive
        ? dom.phraseListAreaElement.querySelector(
            `.phrase-item[data-phrase-id="${phraseId}"] .favorite-btn`,
          )
        : null);
    if (btnToUpdate) {
      btnToUpdate.classList.toggle("active", phrase.isFavorite);
      btnToUpdate.innerHTML = phrase.isFavorite ? "&#10084;" : "&#9825;";
    }
    api.saveProfileData(state.currentProfileData);
  }
}
export async function handleDeletePhraseClick(phraseId) {
  const currentFolder = getCurrentFolderObject();
  if (!currentFolder?.phrases) {
    await modals.showToast("Ошибка: не удалось найти папку.");
    return;
  }
  const phraseIndex = currentFolder.phrases.findIndex((p) => p.id === phraseId);
  if (phraseIndex === -1) {
    await modals.showToast("Ошибка: Фраза не найдена.");
    return;
  }
  const phraseToDelete = currentFolder.phrases[phraseIndex];

  const confirmation = await modals.showConfirm(
    `Удалить фразу "${phraseToDelete.name || "Без имени"}"?`,
    "Удаление фразы",
  );
  if (!confirmation) return;

  if (phraseToDelete.imageFileName)
    await api.deleteAppImage(phraseToDelete.imageFileName);
  currentFolder.phrases.splice(phraseIndex, 1);
  await api.saveProfileData(state.currentProfileData);
  ui.renderFolderContent();
}

export async function handleAddPhraseClick() {
  if (!state.currentProfileInfo || state.isSearchViewActive) {
    await modals.showToast("Нельзя добавить фразу.");
    return;
  }
  const currentFolder = getCurrentFolderObject();
  if (!currentFolder) {
    await modals.showToast("Родительская папка не найдена.");
    return;
  }
  api.openPhraseEditorWindow({
    profileData: state.currentProfileData,
    folderPathIds: state.currentFolderPathIds,
    phraseId: null,
  });
}

// --- ОБРАБОТЧИКИ ДЛЯ СЦЕНАРИЕВ ---
export function handleEditScenarioClick(scenarioId) {
  state.setViewingScenarioId(scenarioId);
  ui.renderScenarioEditorView();
  ui.updateAddButtonsState();
}
export async function handleDeleteScenarioClick(scenarioId) {
  const folder = getCurrentFolderObject();
  if (!folder?.scenarios) return;
  const scenarioIndex = folder.scenarios.findIndex((s) => s.id === scenarioId);
  if (scenarioIndex === -1) {
    await modals.showToast("Сценарий не найден.");
    return;
  }
  const scenario = folder.scenarios[scenarioIndex];

  const confirmation = await modals.showConfirm(
    `Вы уверены, что хотите удалить сценарий "${scenario.name}"?`,
    "Удаление сценария",
  );
  if (confirmation) {
    folder.scenarios.splice(scenarioIndex, 1);
    await api.saveProfileData(state.currentProfileData);
    ui.renderFolderContent();
  }
}

export function handleAddStepClick(scenarioId) {
  api.openStepEditorWindow({
    profileData: state.currentProfileData,
    folderPathIds: state.currentFolderPathIds,
    scenarioId: scenarioId,
    stepId: null,
  });
}
export function handleEditStepClick(scenarioId, stepId) {
  api.openStepEditorWindow({
    profileData: state.currentProfileData,
    folderPathIds: state.currentFolderPathIds,
    scenarioId: scenarioId,
    stepId: stepId,
  });
}

// --- Поиск и Random ---
export function handleRandomPhrase() {
  if (state.isSearchViewActive) {
    modals.showToast("Случайный выбор не работает в поиске.");
    return;
  }
  const currentFolder = getCurrentFolderObject();
  if (
    !currentFolder ||
    !currentFolder.phrases ||
    !currentFolder.phrases.length
  ) {
    modals.showToast("Нет фраз для выбора.");
    return;
  }
  if (state.previouslySelectedRandomPhraseElement) {
    state.previouslySelectedRandomPhraseElement.classList.remove(
      "randomly-selected-phrase",
    );
  }
  const randomIndex = Math.floor(Math.random() * currentFolder.phrases.length);
  const randomPhrase = currentFolder.phrases[randomIndex];
  if (!randomPhrase) {
    console.error("Не удалось выбрать фразу.");
    return;
  }
  const phraseElement = dom.phraseListAreaElement.querySelector(
    `.phrase-item[data-phrase-id="${randomPhrase.id}"]`,
  );
  if (phraseElement) {
    phraseElement.classList.add("randomly-selected-phrase");
    state.setPreviouslySelectedRandomPhraseElement(phraseElement);
    phraseElement.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

export function handleSearch() {
  const searchTerm = dom.searchInputElement.value.trim().toLowerCase();
  if (!state.currentProfileInfo) {
    dom.phraseListAreaElement.innerHTML = "";
    ui.renderBreadcrumbs();
    ui.updateAddButtonsState();
    return;
  }
  if (!searchTerm && !state.isFavoritesViewActive) {
    state.setSearchViewActive(false);
    ui.renderBreadcrumbs();
    ui.renderFolderContent();
    return;
  }
  state.setSearchViewActive(true);
  ui.renderBreadcrumbs();

  let searchResults = [];
  if (
    state.currentProfileData.children &&
    state.currentProfileData.children.length > 0
  ) {
    const profileBreadcrumbBase = [
      { id: state.currentProfileData.id, name: state.currentProfileData.name },
    ];
    findMatchesRecursive(
      state.currentProfileData.children,
      profileBreadcrumbBase,
      searchTerm,
      searchResults,
      state.currentProfileData.id,
      [],
    );
  }

  if (state.isFavoritesViewActive) {
    searchResults = searchResults.filter((result) => {
      return (
        result.type === "folder" ||
        (result.type === "phrase" && result.data.isFavorite)
      );
    });
  }

  ui.renderSearchResults(searchResults, searchTerm);
  ui.updateAddButtonsState();
}

function findMatchesRecursive(
  itemsToSearch,
  currentBreadcrumbPath,
  searchTerm,
  results,
  profileId,
  currentIdPath,
) {
  itemsToSearch.forEach((item) => {
    const itemBreadcrumbPath = [
      ...currentBreadcrumbPath,
      { id: item.id, name: item.name },
    ];
    const itemIdPath = [...currentIdPath, item.id];
    if (item.type === "folder") {
      if (item.name.toLowerCase().includes(searchTerm)) {
        results.push({
          type: "folder",
          data: item,
          breadcrumbPath: itemBreadcrumbPath,
          idPath: itemIdPath,
          profileId: profileId,
        });
      }
      if (item.children && item.children.length > 0) {
        findMatchesRecursive(
          item.children,
          itemBreadcrumbPath,
          searchTerm,
          results,
          profileId,
          itemIdPath,
        );
      }
      if (item.phrases && item.phrases.length > 0) {
        item.phrases.forEach((phrase) => {
          if (
            (phrase.name && phrase.name.toLowerCase().includes(searchTerm)) ||
            (phrase.phraseText &&
              phrase.phraseText.toLowerCase().includes(searchTerm))
          ) {
            results.push({
              type: "phrase",
              data: phrase,
              breadcrumbPath: itemBreadcrumbPath,
              idPath: itemIdPath,
              profileId: profileId,
            });
          }
        });
      }
    }
  });
}

export function handleSidebarToggle() {
  if (!dom.sidebarElement) return;
  const isCollapsed = dom.sidebarElement.classList.toggle("collapsed");
  localStorage.setItem("sidebarCollapsed", isCollapsed);
}
export async function handleAddScenarioClick() {
  if (!state.currentProfileInfo || state.isSearchViewActive) {
    await modals.showToast("Нельзя добавить сценарий в текущем режиме.");
    return;
  }
  const currentFolder = getCurrentFolderObject();
  if (
    !currentFolder ||
    currentFolder.folderType !== constants.FOLDER_TYPE_SCENARIOS
  ) {
    await modals.showToast(
      "Сценарии можно добавлять только в соответствующие папки.",
    );
    return;
  }

  const scenarioName = await modals.showGenericPrompt(
    "Новый сценарий",
    "Введите название сценария:",
  );
  if (!scenarioName || scenarioName.trim() === "") {
    return;
  }

  const scenarioDescription = await modals.showGenericPrompt(
    "Описание сценария",
    "Введите краткое описание (необязательно):",
  );

  currentFolder.scenarios = currentFolder.scenarios || [];
  const newScenario = {
    id: generateId("scenario"),
    name: scenarioName.trim(),
    description: scenarioDescription ? scenarioDescription.trim() : "",
    steps: [],
  };

  currentFolder.scenarios.push(newScenario);
  await api.saveProfileData(state.currentProfileData);
  ui.renderFolderContent();
}

export function handleStartScenario(scenarioId) {
  const scenario = findScenarioById(scenarioId);
  if (scenario) {
    api.openPlayerWindow({ scenario: scenario });
  } else {
    modals.showToast("Ошибка: Не удалось найти сценарий для запуска.");
  }
}

export function handleToggleFavoritesFilter() {
  state.setFavoritesViewActive(!state.isFavoritesViewActive);
  dom.filterFavoritesBtn.classList.toggle(
    "active",
    state.isFavoritesViewActive,
  );
  dom.filterFavoritesBtn.innerHTML = state.isFavoritesViewActive
    ? "&#10084;"
    : "&#9825;";

  if (dom.searchInputElement.value.trim()) {
    handleSearch();
  } else {
    ui.renderFolderContent();
  }
}
export async function handleEditScenarioDetails(fieldToEdit) {
  if (!state.viewingScenarioId) return;

  const scenario = findScenarioById(state.viewingScenarioId); //
  if (!scenario) {
    modals.showToast("Ошибка: сценарий не найден."); //
    return;
  }

  // Определяем, что именно редактируем
  const isName = fieldToEdit === "name";
  const title = isName ? "Редактировать название" : "Редактировать описание";
  const currentValue = isName ? scenario.name : scenario.description;

  // Вызываем стандартное окно для ввода текста
  const newValue = await modals.showGenericPrompt(
    title,
    "Новое значение:",
    currentValue,
  ); //

  // Если пользователь нажал "Отмена" или ничего не изменил, выходим
  if (newValue === null || newValue.trim() === currentValue) {
    return;
  }

  // Название не может быть пустым
  if (isName && newValue.trim() === "") {
    modals.showToast("Название сценария не может быть пустым."); //
    return;
  }

  // Обновляем данные в стейте
  if (isName) {
    scenario.name = newValue.trim();
  } else {
    scenario.description = newValue.trim();
  }

  // Сохраняем и перерисовываем интерфейс
  await api.saveProfileData(state.currentProfileData); //
  ui.renderScenarioEditorView(); //
}
