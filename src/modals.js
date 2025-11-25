import * as state from "./state.js";
import * as dom from "./dom.js";
import * as handlers from "./handlers.js";
import * as constants from "./constants.js";
import * as ui from "./ui.js";
import { generateId } from "./app.js"; // <-- ДОБАВЬТЕ ЭТУ СТРОК

export function promptForAdminPassword() {
  return new Promise((resolve) => {
    dom.passwordModalInput.value = "";
    dom.passwordPromptOverlay.style.display = "flex";
    dom.passwordModalInput.focus();
    let okL, cancelL, keyL, overlayL, closeL;
    okL = () => {
      c();
      resolve(dom.passwordModalInput.value === constants.ADMIN_PASSWORD);
    };
    cancelL = () => {
      c();
      resolve(false);
    };
    keyL = (e) => {
      if (e.key === "Enter") okL();
      else if (e.key === "Escape") cancelL();
    };
    overlayL = (e) => {
      if (e.target === dom.passwordPromptOverlay) cancelL();
    };
    const closeBtn =
      dom.passwordPromptOverlay.querySelector(".modal-close-btn");
    if (closeBtn) {
      closeL = () => {
        cancelL();
      };
      closeBtn.addEventListener("click", closeL);
    }
    function c() {
      dom.passwordModalOkBtn.removeEventListener("click", okL);
      dom.passwordModalCancelBtn.removeEventListener("click", cancelL);
      dom.passwordModalInput.removeEventListener("keydown", keyL);
      dom.passwordPromptOverlay.removeEventListener("click", overlayL);
      if (closeBtn && closeL) closeBtn.removeEventListener("click", closeL);
      dom.passwordPromptOverlay.style.display = "none";
    }
    dom.passwordModalOkBtn.addEventListener("click", okL);
    dom.passwordModalCancelBtn.addEventListener("click", cancelL);
    dom.passwordModalInput.addEventListener("keydown", keyL);
    dom.passwordPromptOverlay.addEventListener("click", overlayL);
  });
}

export function openProfileManagementModal() {
  ui.renderProfilesForEditing();
  dom.newProfileNameInput.value = "";
  dom.manageProfilesOverlay.style.display = "flex";
}

export function closeProfileManagementModal() {
  dom.manageProfilesOverlay.style.display = "none";
}

export function showEmojiPicker(targetElement, onSelect) {
  const picker = dom.emojiPickerPopover;
  const grid = picker.querySelector(".emoji-grid");
  grid.innerHTML = "";
  constants.EMOJI_LIST.forEach((emoji) => {
    const emojiBtn = document.createElement("button");
    emojiBtn.className = "emoji-option";
    emojiBtn.textContent = emoji;
    emojiBtn.onclick = () => {
      onSelect(emoji);
      hideEmojiPicker();
    };
    grid.appendChild(emojiBtn);
  });
  const rect = targetElement.getBoundingClientRect();
  picker.style.top = `${rect.bottom + 5}px`;
  picker.style.left = `${rect.left - 50}px`;
  picker.style.display = "block";
  setTimeout(() => {
    document.addEventListener("click", hideEmojiPickerOnClickOutside, {
      once: true,
    });
  }, 0);
}

function hideEmojiPicker() {
  if (dom.emojiPickerPopover) {
    dom.emojiPickerPopover.style.display = "none";
  }
  document.removeEventListener("click", hideEmojiPickerOnClickOutside);
}

function hideEmojiPickerOnClickOutside(event) {
  if (
    dom.emojiPickerPopover &&
    !dom.emojiPickerPopover.contains(event.target)
  ) {
    hideEmojiPicker();
  } else {
    document.addEventListener("click", hideEmojiPickerOnClickOutside, {
      once: true,
    });
  }
}

export function openPhraseEditorModal(phraseId = null) {
  state.setEditingItemId(phraseId);
  state.setImageActionOnSave("KEEP");
  state.setCurrentPhraseImageSourcePath(null);

  if (dom.noImageTextElement) dom.noImageTextElement.style.display = "block";
  dom.noImageTextElement.textContent = "Нет изображения";
  dom.phraseImagePreview.style.display = "none";
  dom.phraseImagePreview.src = "#";
  dom.phraseClearImageBtn.style.display = "none";
  const oldInfo = dom.phraseImagePreviewContainer.querySelector(
    ".existing-image-info",
  );
  if (oldInfo) oldInfo.remove();
  dom.phraseImagePreviewContainer.removeAttribute("data-existing-filename");

  if (phraseId) {
    const phrase = handlers.findPhraseById(phraseId);
    if (!phrase) {
      showAlert("Ошибка: Не удалось найти фразу для редактирования.");
      return;
    }
    dom.phraseEditorTitle.textContent = "Редактировать фразу";
    dom.phraseEditorNameInput.value = phrase.name || "";
    dom.phraseEditorPhraseTextInput.value = phrase.phraseText || "";
    dom.phraseEditorTranscriptionInput.value = phrase.transcription || "";
    dom.phraseEditorActionTextInput.value = phrase.actionText || "";
    dom.savePhraseBtn.textContent = "Сохранить";
    if (phrase.imageFileName) {
      if (dom.noImageTextElement) dom.noImageTextElement.style.display = "none";
      const infoP = document.createElement("p");
      infoP.className = "existing-image-info";
      infoP.style.cssText = "color:#ccc;font-size:0.9em;margin:0;";
      infoP.textContent = `Прикреплено: ${phrase.imageFileName}`;
      dom.phraseImagePreviewContainer.innerHTML = "";
      dom.phraseImagePreviewContainer.appendChild(infoP);
      dom.phraseClearImageBtn.style.display = "inline-block";
    }
  } else {
    dom.phraseEditorTitle.textContent = "Добавить новую фразу";
    dom.phraseEditorNameInput.value = "";
    dom.phraseEditorPhraseTextInput.value = "";
    dom.phraseEditorTranscriptionInput.value = "";
    dom.phraseEditorActionTextInput.value = "";
    dom.savePhraseBtn.textContent = "Добавить";
  }
  dom.phraseEditorModalOverlay.style.display = "flex";
  if (dom.phraseEditorNameInput) dom.phraseEditorNameInput.focus();
}

export function closePhraseEditorModal() {
  dom.phraseEditorModalOverlay.style.display = "none";
  state.setEditingItemId(null);
  state.setImageActionOnSave(null);
  state.setCurrentPhraseImageSourcePath(null);
}

export function promptForFolderType() {
  return new Promise((resolve) => {
    dom.selectFolderTypeModal.style.display = "flex";

    const handler = (e) => {
      const btn = e.target.closest(".folder-type-option");
      if (btn) {
        cleanup();
        resolve(btn.dataset.folderType);
      }
    };

    const overlayHandler = (e) => {
      // Закрываем, если клик был по фону (самому оверлею)
      if (e.target === dom.selectFolderTypeModal) {
        cleanup();
        resolve(null); // Отмена действия
      }
    };

    function cleanup() {
      dom.selectFolderTypeModal.removeEventListener("click", handler);
      dom.selectFolderTypeModal.removeEventListener("click", overlayHandler);
      dom.selectFolderTypeModal.style.display = "none";
    }

    dom.selectFolderTypeModal.addEventListener("click", handler);
    dom.selectFolderTypeModal.addEventListener("click", overlayHandler);
  });
}
export function showGenericPrompt(title, message, defaultValue = "") {
  return new Promise((resolve) => {
    state.setCurrentCustomModalResolve(resolve);
    dom.modalTitleElement.textContent = title;
    dom.modalMessageElement.textContent = message;
    dom.modalInputElement.value = defaultValue;
    dom.modalInputElement.placeholder = defaultValue || "Введите значение...";
    dom.customPromptOverlay.style.display = "flex";
    dom.modalInputElement.focus();
    dom.modalInputElement.select();
  });
}

export function showToast(message) {
  if (!dom.toastContainer) return;

  // 1. Создаем элемент уведомления
  const toast = document.createElement("div");
  toast.className = "toast-message";
  toast.textContent = message;

  // 2. Добавляем его в контейнер
  dom.toastContainer.appendChild(toast);

  // 3. Запускаем анимацию появления
  setTimeout(() => {
    toast.classList.add("show");
  }, 10); // Небольшая задержка для срабатывания CSS transition

  // 4. Устанавливаем таймер на скрытие и удаление элемента
  setTimeout(() => {
    toast.classList.remove("show");

    // Удаляем элемент из DOM после завершения анимации исчезновения
    toast.addEventListener("transitionend", () => {
      toast.remove();
    });
  }, 1200); // Уведомление будет на экране 1.2 секунды
}

export function openStepEditorModal(scenarioId, stepId = null) {
  state.setEditingItemId(stepId);
  dom.saveStepBtn.dataset.scenarioId = scenarioId;

  // Устанавливаем обработчик на новую кнопку "Добавить блок"
  const addBlockBtn = dom.stepActionsPanel.querySelector(
    "#add-action-block-btn",
  );
  if (addBlockBtn) {
    // .onclick гарантирует, что мы не добавим лишних слушателей при повторном открытии
    addBlockBtn.onclick = () => handlers.handleAddActionBlock();
  }

  dom.stepActionsListContainer.innerHTML = "";

  let stepData;
  if (stepId) {
    // Редактирование существующего этапа
    const scenario = handlers.findScenarioById(scenarioId);
    const originalStep = scenario?.steps.find((s) => s.id === stepId);
    if (!originalStep) {
      showAlert("Ошибка: этап для редактирования не найден.");
      return;
    }
    stepData = JSON.parse(JSON.stringify(originalStep));

    // Логика совместимости: если у этапа есть `actions`, но нет `actionBlocks`,
    // конвертируем старую структуру в новую.
    if (stepData.actions && !stepData.actionBlocks) {
      stepData.actionBlocks = [
        {
          id: generateId("block"),
          actions: stepData.actions,
        },
      ];
      delete stepData.actions;
    }

    dom.stepEditorTitle.textContent = "Редактировать этап";
  } else {
    // Создание нового этапа
    stepData = {
      id: generateId("step"),
      name: "",
      descriptionForStep: "",
      actionBlocks: [], // Новый этап начинается с пустым списком блоков
    };
    state.setEditingItemId(stepData.id);
    dom.stepEditorTitle.textContent = "Новый этап";
  }

  state.setStepBeingEdited(stepData);

  dom.stepEditorNameInput.value = stepData.name || "";
  dom.stepEditorDescriptionInput.value = stepData.descriptionForStep || "";

  // Отрисовываем существующие блоки действий
  if (stepData.actionBlocks && stepData.actionBlocks.length > 0) {
    stepData.actionBlocks.forEach((block) => {
      const blockElement = ui.createActionBlockElement(block);
      dom.stepActionsListContainer.appendChild(blockElement);
    });
  }

  dom.stepEditorModalOverlay.style.display = "flex";
  dom.stepEditorNameInput.focus();
}
export function closeStepEditorModal() {
  dom.stepEditorModalOverlay.style.display = "none";
  state.setEditingItemId(null);
  state.setStepBeingEdited(null);
  dom.saveStepBtn.removeAttribute("data-scenario-id");
}
export function showConfirm(message, title = "Подтверждение") {
  return new Promise((resolve) => {
    dom.confirmModalTitle.textContent = title;
    dom.confirmModalMessage.textContent = message;
    dom.confirmModalOverlay.style.display = "flex";

    const cleanupAndResolve = (result) => {
      dom.confirmModalOverlay.style.display = "none";
      dom.confirmModalOkBtn.removeEventListener("click", okListener);
      dom.confirmModalCancelBtn.removeEventListener("click", cancelListener);
      resolve(result);
    };

    const okListener = () => cleanupAndResolve(true);
    const cancelListener = () => cleanupAndResolve(false);

    dom.confirmModalOkBtn.addEventListener("click", okListener);
    dom.confirmModalCancelBtn.addEventListener("click", cancelListener);
  });
}
export function showAlert(message, title = "Внимание") {
  return new Promise((resolve) => {
    dom.alertModalMessage.textContent = message;

    const alertTitle =
      dom.alertModalOverlay.querySelector("#alert-modal-title");
    if (alertTitle) alertTitle.textContent = title;

    dom.alertModalOverlay.style.display = "flex";

    const okListener = () => {
      dom.alertModalOverlay.style.display = "none";
      dom.alertModalOkBtn.removeEventListener("click", okListener);
      resolve();
    };

    dom.alertModalOkBtn.addEventListener("click", okListener);
  });
}
