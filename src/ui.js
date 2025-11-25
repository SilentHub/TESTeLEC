import * as state from "./state.js";
import * as dom from "./dom.js";
import * as handlers from "./handlers.js";
import * as constants from "./constants.js";
import * as modals from "./modals.js";
import * as app from "./app.js";
import * as api from "./api.js";
import { navigateToPath } from "./app.js";

// --- ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ПОДСЧЕТА ---
function countPhrasesRecursive(folder) {
  let count = 0;
  if (folder.phrases && folder.phrases.length > 0) {
    count += folder.phrases.length;
  }
  if (folder.children && folder.children.length > 0) {
    for (const child of folder.children) {
      if (child.type === "folder") {
        count += countPhrasesRecursive(child);
      }
    }
  }
  return count;
}

// --- КОНТЕКСТНОЕ МЕНЮ ---
export function showContextMenu(event, menuItems) {
  event.preventDefault();
  event.stopPropagation();

  const menu = dom.contextMenu;
  menu.innerHTML = "";

  menuItems.forEach((item) => {
    if (item.separator) {
      const separator = document.createElement("div");
      separator.className = "context-menu-separator";
      menu.appendChild(separator);
      return;
    }

    const menuItem = document.createElement("div");
    menuItem.className = "context-menu-item";
    if (item.isDestructive) {
      menuItem.classList.add("destructive");
    }
    menuItem.textContent = item.label;
    menuItem.onclick = (e) => {
      e.stopPropagation();
      hideContextMenu();
      item.callback();
    };
    menu.appendChild(menuItem);
  });

  menu.style.display = "block";
  const { clientX, clientY } = event;
  const menuWidth = menu.offsetWidth;
  const menuHeight = menu.offsetHeight;
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;

  let top = clientY;
  let left = clientX;

  if (clientX + menuWidth > screenWidth) {
    left = screenWidth - menuWidth - 5;
  }
  if (clientY + menuHeight > screenHeight) {
    top = screenHeight - menuHeight - 5;
  }

  menu.style.top = `${top}px`;
  menu.style.left = `${left}px`;
}

export function hideContextMenu() {
  if (dom.contextMenu) {
    dom.contextMenu.style.display = "none";
  }
}

// --- РЕНДЕРИНГ ЭЛЕМЕНТОВ ---

// ИЗМЕНЕНИЕ 1: Убираем счетчик из основного списка
export function renderProfileList() {
  dom.profileListElement.innerHTML = "";
  if (state.profilesList.length === 0) {
    dom.profileListElement.innerHTML = `<li style="padding:12px 20px;color:#888;">Нет профилей</li>`;
    return;
  }
  state.profilesList.forEach((profile) => {
    const li = document.createElement("li");
    li.className = "profile-item";

    const emojiSpan = document.createElement("span");
    emojiSpan.className = "profile-emoji";
    emojiSpan.textContent = profile.emoji || "🙂";

    const nameSpan = document.createElement("span");
    nameSpan.className = "profile-name";
    nameSpan.textContent = ` ${profile.name}`;

    li.appendChild(emojiSpan);
    li.appendChild(nameSpan); // Просто добавляем имя

    li.dataset.profileId = profile.id;
    li.addEventListener("click", async () => {
      const success = await handlers.selectProfile(profile.id);
      if (success) {
        updateActiveProfileInSidebar();
        renderBreadcrumbs();
        renderFolderContent();
      }
    });
    dom.profileListElement.appendChild(li);
  });
  updateActiveProfileInSidebar();
}

export function updateActiveProfileInSidebar() {
  const currentId = state.currentProfileInfo
    ? state.currentProfileInfo.id
    : null;
  dom.profileListElement.querySelectorAll(".profile-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.profileId === currentId);
  });
}

// ИЗМЕНЕНИЕ 2: Добавляем счетчик в окно "Управление профилями"
export function renderProfilesForEditing() {
  dom.profilesEditorListElement.innerHTML = "";
  state.profilesList.forEach((profile) => {
    const itemDiv = document.createElement("div");
    itemDiv.className = "profile-edit-item";

    // --- ГЛАВНОЕ ИЗМЕНЕНИЕ ---
    // Создаем единый контейнер для всего, что слева
    const nameContainer = document.createElement("div");
    nameContainer.className = "profile-name-container";

    const emojiSpan = document.createElement("span");
    emojiSpan.className = "profile-emoji";
    emojiSpan.textContent = profile.emoji || "🙂";

    const nameSpan = document.createElement("span");
    nameSpan.className = "profile-name-text";
    nameSpan.textContent =
      ` ${profile.name}` +
      (profile.id === constants.ADMIN_PROFILE_ID ? " (Админ)" : "");

    // Добавляем иконку и имя в контейнер
    nameContainer.appendChild(emojiSpan);
    nameContainer.appendChild(nameSpan);

    // Добавляем счетчик в этот же контейнер, если он есть
    if (profile.itemCount > 0) {
      const countSpan = document.createElement("span");
      countSpan.className = "item-count";
      countSpan.textContent = profile.itemCount;
      nameContainer.appendChild(countSpan);
    }
    // --- КОНЕЦ ИЗМЕНЕНИЙ ---

    itemDiv.appendChild(nameContainer);

    itemDiv.addEventListener("contextmenu", (e) => {
      const menuItems = [
        {
          label: "Изменить имя",
          callback: () => handlers.handleEditProfileNameClick(profile.id),
        },
        {
          label: "Изменить смайлик",
          callback: () =>
            handlers.showEmojiPickerForProfile(itemDiv, profile.id),
        },
      ];

      if (profile.id !== constants.ADMIN_PROFILE_ID) {
        menuItems.push({ separator: true });
        menuItems.push({
          label: "Удалить профиль",
          isDestructive: true,
          callback: () => handlers.handleDeleteProfile(profile.id),
        });
      }
      showContextMenu(e, menuItems);
    });

    dom.profilesEditorListElement.appendChild(itemDiv);
  });
}

export function renderBreadcrumbs(extraCrumb = null) {
  dom.breadcrumbNavElement.innerHTML = "";
  if (!state.currentProfileInfo && !state.isSearchViewActive) {
    updateAddButtonsState();
    return;
  }
  if (state.isSearchViewActive) {
    dom.breadcrumbNavElement.innerHTML =
      '<span class="breadcrumb-item current">Результаты поиска</span>';
    updateAddButtonsState();
    return;
  }
  const profileCrumb = document.createElement("span");
  profileCrumb.className = "breadcrumb-item";
  profileCrumb.textContent = `${state.currentProfileInfo.emoji || "🙂"} ${state.currentProfileInfo.name.toUpperCase()}`;
  profileCrumb.style.cursor = "pointer";
  profileCrumb.addEventListener("click", () => navigateToPath([]));
  dom.breadcrumbNavElement.appendChild(profileCrumb);
  let currentPathObject = state.currentProfileData;
  state.currentFolderPathIds.forEach((folderId, index) => {
    if (!currentPathObject.children) return;
    currentPathObject = currentPathObject.children.find(
      (f) => f.id === folderId,
    );
    if (!currentPathObject) {
      const errorCrumb = document.createElement("span");
      errorCrumb.innerHTML = ` / <span style="color:red;">ОШИБКА ПУТИ</span>`;
      dom.breadcrumbNavElement.appendChild(errorCrumb);
      return;
    }
    const separator = document.createElement("span");
    separator.className = "breadcrumb-separator";
    separator.textContent = "/";
    dom.breadcrumbNavElement.appendChild(separator);
    const folderCrumb = document.createElement("span");
    folderCrumb.className = "breadcrumb-item";
    folderCrumb.textContent = currentPathObject.name.toUpperCase();
    if (index < state.currentFolderPathIds.length - 1 || extraCrumb) {
      folderCrumb.style.cursor = "pointer";
      const pathForThisCrumb = state.currentFolderPathIds.slice(0, index + 1);
      folderCrumb.addEventListener("click", () =>
        navigateToPath(pathForThisCrumb),
      );
    }
    dom.breadcrumbNavElement.appendChild(folderCrumb);
  });
  if (extraCrumb) {
    const separator = document.createElement("span");
    separator.className = "breadcrumb-separator";
    separator.textContent = "/";
    dom.breadcrumbNavElement.appendChild(separator);
    const extraCrumbSpan = document.createElement("span");
    extraCrumbSpan.className = "breadcrumb-item current";
    extraCrumbSpan.textContent = extraCrumb.toUpperCase();
    dom.breadcrumbNavElement.appendChild(extraCrumbSpan);
  } else {
    const allCrumbs =
      dom.breadcrumbNavElement.querySelectorAll(".breadcrumb-item");
    if (allCrumbs.length > 0) {
      allCrumbs[allCrumbs.length - 1].classList.add("current");
      allCrumbs[allCrumbs.length - 1].style.cursor = "default";
    }
  }
  updateAddButtonsState();
}

export function renderFolderContent() {
  dom.phraseListAreaElement.innerHTML = "";
  if (!state.currentProfileData) {
    dom.phraseListAreaElement.innerHTML =
      '<p class="empty-folder-message">Профиль не выбран.</p>';
    updateAddButtonsState();
    return;
  }

  if (state.viewingScenarioId) {
    renderScenarioEditorView();
    return;
  }

  const currentFolder = handlers.getCurrentFolderObject();
  if (!currentFolder) {
    dom.phraseListAreaElement.innerHTML =
      '<p class="empty-folder-message">Ошибка: Папка не найдена.</p>';
    updateAddButtonsState();
    return;
  }
  let contentRendered = false;

  // Рендеринг подпапок
  if (currentFolder.children && currentFolder.children.length > 0) {
    currentFolder.children.sort((a, b) => (a.order || 0) - (b.order || 0));

    currentFolder.children.forEach((subfolder) => {
      if (subfolder.type === "folder") {
        const folderDiv = document.createElement("div");
        folderDiv.className = "list-item folder-item";
        folderDiv.dataset.id = subfolder.id;

        const folderIcon = document.createElement("span");
        folderIcon.className = "folder-icon";
        switch (subfolder.folderType) {
          case constants.FOLDER_TYPE_CONTAINER:
            folderIcon.innerHTML = "&#128193;";
            folderIcon.title = "Папка для папок";
            break;
          case constants.FOLDER_TYPE_PHRASES:
            folderIcon.innerHTML = "&#128195;";
            folderIcon.title = "Папка для фраз";
            break;
          case constants.FOLDER_TYPE_SCENARIOS:
            folderIcon.innerHTML = "&#127916;";
            folderIcon.title = "Папка для сценариев";
            break;
          default:
            folderIcon.innerHTML = "&#128193;";
        }

        const folderNameSpan = document.createElement("span");
        folderNameSpan.className = "folder-name-list";
        folderNameSpan.textContent = subfolder.name;

        const clickableArea = document.createElement("div");
        clickableArea.style.display = "flex";
        clickableArea.style.alignItems = "center";
        clickableArea.style.cursor = "pointer";
        clickableArea.appendChild(folderIcon);
        clickableArea.appendChild(folderNameSpan);
        clickableArea.addEventListener("click", () =>
          navigateToPath([...state.currentFolderPathIds, subfolder.id]),
        );

        folderDiv.appendChild(clickableArea);

        let count = 0;
        if (
          subfolder.folderType === constants.FOLDER_TYPE_PHRASES ||
          subfolder.folderType === constants.FOLDER_TYPE_CONTAINER
        ) {
          count = countPhrasesRecursive(subfolder);
        } else if (subfolder.folderType === constants.FOLDER_TYPE_SCENARIOS) {
          count = subfolder.scenarios?.length || 0;
        }

        if (count > 0) {
          const countSpan = document.createElement("span");
          countSpan.className = "item-count";
          countSpan.textContent = count;
          folderDiv.appendChild(countSpan);
        }

        folderDiv.addEventListener("contextmenu", (e) => {
          const menuItems = [
            {
              label: "Переименовать",
              callback: () => handlers.handleEditFolderNameClick(subfolder.id),
            },
            { separator: true },
            {
              label: "Удалить папку",
              isDestructive: true,
              callback: () => handlers.handleDeleteFolderClick(subfolder.id),
            },
          ];
          showContextMenu(e, menuItems);
        });

        dom.phraseListAreaElement.appendChild(folderDiv);
        contentRendered = true;
      }
    });
  }

  // Рендеринг фраз
  if (
    currentFolder.folderType === constants.FOLDER_TYPE_PHRASES &&
    currentFolder.phrases &&
    currentFolder.phrases.length > 0
  ) {
    currentFolder.phrases.sort((a, b) => (a.order || 0) - (b.order || 0));
    let phrasesToRender = [...currentFolder.phrases];

    if (state.isFavoritesViewActive) {
      phrasesToRender = phrasesToRender.filter((p) => p.isFavorite);
    }

    const sortedPhrases = phrasesToRender.sort(
      (a, b) => (a.order || 0) - (b.order || 0),
    );

    if (sortedPhrases.length === 0) {
      const message = state.isFavoritesViewActive
        ? "Нет избранных фраз в этой папке."
        : "В этой папке нет фраз.";
      dom.phraseListAreaElement.innerHTML = `<p class="empty-folder-message">${message}</p>`;
    } else {
      sortedPhrases.forEach((phrase, index) => {
        const phraseDiv = document.createElement("div");
        phraseDiv.className = "list-item phrase-item";
        phraseDiv.dataset.phraseId = phrase.id;

        const displayOrder =
          phrase.order !== undefined ? phrase.order : index + 1;

        const phraseNameElement = document.createElement("div");
        phraseNameElement.className = "phrase-text-content";
        phraseNameElement.textContent = phrase.name || "Без названия";

        const phraseActionsDiv = document.createElement("div");
        phraseActionsDiv.className = "phrase-actions";

        const textBtn = document.createElement("button");
        textBtn.className = "action-btn text-btn";
        textBtn.title = "Копировать текст ФРАЗЫ";
        textBtn.textContent = "📋";
        textBtn.addEventListener("click", () =>
          handlers.handleCopyText(phrase.id),
        );

        const sayBtn = document.createElement("button");
        sayBtn.className = "action-btn say-btn";
        sayBtn.title = "Показать детали";
        sayBtn.textContent = "👄";
        sayBtn.addEventListener("click", () =>
          handlers.handleSayText(phrase.id),
        );

        const favoriteBtn = document.createElement("button");
        favoriteBtn.className = `action-btn favorite-btn ${phrase.isFavorite ? "active" : ""}`;
        favoriteBtn.title = "В избранное";
        favoriteBtn.innerHTML = phrase.isFavorite ? "&#10084;" : "&#9825;";
        favoriteBtn.addEventListener("click", (e) =>
          handlers.handleToggleFavorite(phrase.id, e.currentTarget),
        );

        phraseActionsDiv.appendChild(textBtn);
        phraseActionsDiv.appendChild(sayBtn);
        phraseActionsDiv.appendChild(favoriteBtn);

        phraseDiv.innerHTML = `<span class="phrase-order">${displayOrder}.</span>`;
        phraseDiv.appendChild(phraseNameElement);
        phraseDiv.appendChild(phraseActionsDiv);

        phraseDiv.addEventListener("contextmenu", (e) => {
          const menuItems = [
            {
              label: "Редактировать фразу",
              callback: () => {
                api.openPhraseEditorWindow({
                  profileData: state.currentProfileData,
                  folderPathIds: state.currentFolderPathIds,
                  phraseId: phrase.id,
                });
              },
            },
            { separator: true },
            {
              label: "Удалить фразу",
              isDestructive: true,
              callback: () => handlers.handleDeletePhraseClick(phrase.id),
            },
          ];
          showContextMenu(e, menuItems);
        });

        dom.phraseListAreaElement.appendChild(phraseDiv);
      });
    }

    if (sortedPhrases.length > 0) {
      setTimeout(() => app.initPhraseDragAndDrop(), 0);
    }
    contentRendered = true;
  } else if (
    state.isFavoritesViewActive &&
    currentFolder.folderType === constants.FOLDER_TYPE_PHRASES
  ) {
    dom.phraseListAreaElement.innerHTML = `<p class="empty-folder-message">Нет избранных фраз в этой папке.</p>`;
    contentRendered = true;
  }

  // Рендеринг сценариев
  if (
    currentFolder.folderType === constants.FOLDER_TYPE_SCENARIOS &&
    currentFolder.scenarios &&
    currentFolder.scenarios.length > 0
  ) {
    currentFolder.scenarios.forEach((scenario) => {
      const scenarioDiv = document.createElement("div");
      scenarioDiv.className = "list-item scenario-item";
      scenarioDiv.dataset.id = scenario.id;
      scenarioDiv.innerHTML = `
            <span class="folder-icon" title="Сценарий">🎬</span>
            <div class="scenario-info">
                <span class="folder-name-list">${escapeHTML(scenario.name)}</span>
                <small class="scenario-description">${escapeHTML(scenario.description) || "Нет описания"}</small>
            </div>
        `;
      const actionsDiv = document.createElement("div");
      actionsDiv.className = "folder-actions";
      const startBtn = document.createElement("button");
      startBtn.className = "action-btn";
      startBtn.title = "Запустить сценарий";
      startBtn.innerHTML = "▶️ START";
      startBtn.onclick = (e) => {
        e.stopPropagation();
        handlers.handleStartScenario(scenario.id);
      };
      actionsDiv.appendChild(startBtn);
      scenarioDiv.appendChild(actionsDiv);

      scenarioDiv.addEventListener("contextmenu", (e) => {
        const menuItems = [
          {
            label: "Редактировать сценарий",
            callback: () => handlers.handleEditScenarioClick(scenario.id),
          },
          { separator: true },
          {
            label: "Удалить сценарий",
            isDestructive: true,
            callback: () => handlers.handleDeleteScenarioClick(scenario.id),
          },
        ];
        showContextMenu(e, menuItems);
      });

      dom.phraseListAreaElement.appendChild(scenarioDiv);
      contentRendered = true;
    });
    setTimeout(() => app.initScenarioDragAndDrop(), 0);
  }

  if (!contentRendered) {
    dom.phraseListAreaElement.innerHTML =
      '<p class="empty-folder-message">Папка пуста.</p>';
  }
  updateAddButtonsState();
}

export function renderScenarioEditorView() {
  if (!state.viewingScenarioId) {
    renderFolderContent();
    return;
  }
  const scenario = handlers.findScenarioById(state.viewingScenarioId);
  if (!scenario) {
    modals.showToast("Ошибка: сценарий не найден!");
    state.setViewingScenarioId(null);
    renderFolderContent();
    return;
  }
  renderBreadcrumbs(scenario.name);
  dom.phraseListAreaElement.innerHTML = "";
  const editorHeader = document.createElement("div");
  editorHeader.className = "scenario-editor-header";
  editorHeader.innerHTML = `
        <button class="action-button-main" id="start-scenario-btn">▶️ START</button>
        <div class="scenario-editor-title">
            <h3 id="scenario-editor-name" style="cursor: pointer;" title="Нажмите, чтобы изменить название">${escapeHTML(scenario.name)}</h3>
            <p id="scenario-editor-description" style="cursor: pointer;" title="Нажмите, чтобы изменить описание">${escapeHTML(scenario.description) || "Нажмите, чтобы добавить описание"}</p>
        </div>
        <button class="action-button-main" id="add-step-btn">Добавить этап</button>
    `;
  dom.phraseListAreaElement.appendChild(editorHeader);
  document.getElementById("start-scenario-btn").onclick = () =>
    handlers.handleStartScenario(scenario.id);
  document.getElementById("scenario-editor-name").onclick = () =>
    handlers.handleEditScenarioDetails("name");
  document.getElementById("scenario-editor-description").onclick = () =>
    handlers.handleEditScenarioDetails("description");
  document.getElementById("add-step-btn").onclick = () =>
    handlers.handleAddStepClick(scenario.id); //

  document.getElementById("add-step-btn").onclick = () =>
    handlers.handleAddStepClick(scenario.id);

  const stepsList = document.createElement("div");
  stepsList.className = "steps-list";
  if (scenario.steps && scenario.steps.length > 0) {
    scenario.steps.sort((a, b) => (a.order || 0) - (b.order || 0));

    scenario.steps.forEach((step, index) => {
      const stepDiv = document.createElement("div");
      stepDiv.className = "list-item step-item";
      stepDiv.innerHTML = `
                <span class="phrase-order">${index + 1}.</span>
                <span class="folder-name-list">${escapeHTML(step.name)}</span>
            `;

      stepDiv.addEventListener("contextmenu", (e) => {
        const menuItems = [
          {
            label: "Редактировать этап",
            callback: () => handlers.handleEditStepClick(scenario.id, step.id),
          },
          { separator: true },
          {
            label: "Удалить этап",
            isDestructive: true,
            callback: () =>
              handlers.handleDeleteStepClick(scenario.id, step.id),
          },
        ];
        showContextMenu(e, menuItems);
      });
      stepsList.appendChild(stepDiv);
    });
  } else {
    stepsList.innerHTML =
      '<p class="empty-folder-message">В этом сценарии пока нет этапов.</p>';
  }
  dom.phraseListAreaElement.appendChild(stepsList);
  updateAddButtonsState();
  app.initStepDragAndDrop();
}

export function updateAddButtonsState() {
  dom.addFolderBtn.style.display = "none";
  dom.addPhraseBtn.style.display = "none";
  dom.addScenarioBtn.style.display = "none";

  if (
    !state.currentProfileInfo ||
    state.isSearchViewActive ||
    state.viewingScenarioId
  ) {
    return;
  }

  const currentFolder = handlers.getCurrentFolderObject();
  if (!currentFolder) {
    return;
  }

  if (
    currentFolder.type === "profile" ||
    currentFolder.folderType === constants.FOLDER_TYPE_CONTAINER
  ) {
    dom.addFolderBtn.style.display = "";
  }

  if (currentFolder.folderType === constants.FOLDER_TYPE_PHRASES) {
    dom.addPhraseBtn.style.display = "";
  }

  if (currentFolder.folderType === constants.FOLDER_TYPE_SCENARIOS) {
    dom.addScenarioBtn.style.display = "";
  }
}

export function displayNoProfilesMessage(msg = "Нет профилей.") {
  dom.profileListElement.innerHTML = `<li style="padding:12px 20px;color:#888;">${msg}</li>`;
  dom.breadcrumbNavElement.innerHTML = "";
  dom.phraseListAreaElement.innerHTML = `<p class="empty-folder-message" style="text-align:center;margin-top:20px;">${msg}</p>`;
  updateAddButtonsState();
}

export function escapeHTML(str) {
  if (typeof str !== "string") return "";
  const p = document.createElement("p");
  p.textContent = str;
  return p.innerHTML;
}

export function highlightText(text, searchTerm) {
  if (!searchTerm) return escapeHTML(text);
  const term = escapeHTML(searchTerm);
  const textEscaped = escapeHTML(text);
  const regex = new RegExp(
    `(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
    "gi",
  );
  return textEscaped.replace(regex, '<mark class="search-highlight">$1</mark>');
}

export function renderSearchResults(results, searchTerm) {
  dom.phraseListAreaElement.innerHTML = "";
  if (results.length === 0) {
    dom.phraseListAreaElement.innerHTML =
      '<p class="empty-folder-message">Ничего не найдено.</p>';
    return;
  }
  results.forEach((result) => {
    const resultDiv = document.createElement("div");
    resultDiv.className = "list-item search-result-item";
    const pathString = result.breadcrumbPath.map((p) => p.name).join(" / ");
    if (result.type === "folder") {
      resultDiv.classList.add("folder-item");
      resultDiv.dataset.id = result.data.id;
      resultDiv.innerHTML = `<span class="folder-icon">&#128193;</span><div class="search-result-info"><span class="folder-name-list">${highlightText(result.data.name, searchTerm)}</span><small class="search-result-path">${highlightText(pathString, searchTerm)}</small></div>`;
      resultDiv.addEventListener("click", () => navigateToPath(result.idPath));
    } else if (result.type === "phrase") {
      resultDiv.classList.add("phrase-item");
      resultDiv.dataset.phraseId = result.data.id;
      const phrase = result.data;
      const displayOrder = phrase.order !== undefined ? phrase.order : "*";
      const phraseNameElement = document.createElement("div");
      phraseNameElement.className = "phrase-text-content";
      phraseNameElement.innerHTML = highlightText(phrase.name, searchTerm);

      const phraseActionsDiv = document.createElement("div");
      phraseActionsDiv.className = "phrase-actions";

      const textBtn = document.createElement("button");
      textBtn.className = "action-btn text-btn";
      textBtn.title = "Копировать";
      textBtn.textContent = "TEXT";
      textBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        handlers.handleCopyText(phrase.id, result.profileId, result.idPath);
      });

      const sayBtn = document.createElement("button");
      sayBtn.className = "action-btn say-btn";
      sayBtn.title = "Показать";
      sayBtn.textContent = "SAY";
      sayBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        handlers.handleSayText(phrase.id, result.profileId, result.idPath);
      });

      const favoriteBtn = document.createElement("button");
      favoriteBtn.className = `action-btn favorite-btn ${phrase.isFavorite ? "active" : ""}`;
      favoriteBtn.title = "Избранное";
      favoriteBtn.innerHTML = phrase.isFavorite ? "&#10084;" : "&#9825;";
      favoriteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        handlers.handleToggleFavorite(
          phrase.id,
          e.currentTarget,
          result.profileId,
          result.idPath,
        );
      });

      phraseActionsDiv.appendChild(textBtn);
      phraseActionsDiv.appendChild(sayBtn);
      phraseActionsDiv.appendChild(favoriteBtn);

      const mainContentDiv = document.createElement("div");
      mainContentDiv.style.flexGrow = "1";
      mainContentDiv.appendChild(phraseNameElement);
      mainContentDiv.innerHTML += `<small class="search-result-path">${highlightText(pathString, searchTerm)}</small>`;

      resultDiv.innerHTML = `<span class="phrase-order">${displayOrder}.</span>`;
      resultDiv.appendChild(mainContentDiv);
      resultDiv.appendChild(phraseActionsDiv);
      resultDiv.addEventListener("click", (e) => {
        if (e.target.closest(".action-btn")) return;
        navigateToPath(result.idPath);
      });
      resultDiv.addEventListener("contextmenu", (e) => {
        const menuItems = [
          {
            label: "Редактировать фразу",
            callback: () => {
              api.openPhraseEditorWindow({
                profileData: state.currentProfileData,
                folderPathIds: result.idPath,
                phraseId: phrase.id,
              });
            },
          },
        ];
        showContextMenu(e, menuItems);
      });
    }
    dom.phraseListAreaElement.appendChild(resultDiv);
  });
}
