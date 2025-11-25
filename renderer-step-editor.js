let currentProfileData = null;
let scenarioId = null;
let stepId = null;
let stepBeingEdited = null;
let currentFolderPathIds = [];

const dom = {
  title: document.getElementById("step-editor-title"),
  nameInput: document.getElementById("step-editor-name"),
  descriptionInput: document.getElementById("step-editor-description"),
  addBlockBtn: document.getElementById("add-action-block-btn"),
  actionsListContainer: document.getElementById("step-actions-list-container"),
  saveBtn: document.getElementById("save-btn"),
  cancelBtn: document.getElementById("cancel-btn"),
};

function generateId(prefix = "item") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// --- Логика рендеринга ---

function createActionRowElement(action, blockId) {
  const actionDiv = document.createElement("div");
  actionDiv.className = "step-action-item";
  actionDiv.dataset.actionId = action.id;
  let icon = action.type === "say" ? "💬" : action.type === "do" ? "🎬" : "🔥";

  const textDiv = document.createElement("div");
  textDiv.className = "action-text";
  textDiv.setAttribute("contenteditable", "true");
  textDiv.textContent = action.text;

  // ---> ИЗМЕНЕНИЕ ЗДЕСЬ <---
  // Используем innerText вместо textContent, чтобы сохранить переносы строк.
  textDiv.addEventListener("blur", () =>
    handleActionTextEdit(blockId, action.id, textDiv.innerText),
  );
  actionDiv.innerHTML = `<span class="icon">${icon}</span>`;
  actionDiv.appendChild(textDiv);

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-action-btn";
  deleteBtn.innerHTML = "&times;";
  deleteBtn.onclick = () => handleDeleteActionFromBlock(blockId, action.id);
  actionDiv.appendChild(deleteBtn);
  return actionDiv;
}

function createActionBlockElement(block) {
  const blockDiv = document.createElement("div");
  blockDiv.className = "step-editor-action-block";
  blockDiv.dataset.blockId = block.id;

  const deleteBlockBtn = document.createElement("button");
  deleteBlockBtn.className = "delete-block-btn";
  deleteBlockBtn.innerHTML = "🗑️";
  deleteBlockBtn.onclick = () => handleDeleteActionBlock(block.id);
  blockDiv.appendChild(deleteBlockBtn);

  const actionsListDiv = document.createElement("div");
  actionsListDiv.className = "actions-list";
  block.actions?.forEach((action) =>
    actionsListDiv.appendChild(createActionRowElement(action, block.id)),
  );
  blockDiv.appendChild(actionsListDiv);

  const controlsDiv = document.createElement("div");
  controlsDiv.className = "block-controls";
  controlsDiv.innerHTML = `
        <button class="add-action-to-block-btn" data-type="say"><span>+</span> 💬</button>
        <button class="add-action-to-block-btn" data-type="do"><span>+</span> 🎬</button>
        <button class="add-action-to-block-btn" data-type="emote"><span>+</span> 🔥</button>`;
  controlsDiv.querySelectorAll(".add-action-to-block-btn").forEach((btn) => {
    btn.onclick = () => handleAddNewActionToBlock(block.id, btn.dataset.type);
  });
  blockDiv.appendChild(controlsDiv);
  return blockDiv;
}

// --- Логика управления ---

function handleAddActionBlock() {
  if (!stepBeingEdited) return;
  const newBlock = { id: generateId("block"), actions: [] };
  stepBeingEdited.actionBlocks.push(newBlock);
  dom.actionsListContainer.appendChild(createActionBlockElement(newBlock));
}

function handleDeleteActionBlock(blockId) {
  if (!stepBeingEdited) return;
  stepBeingEdited.actionBlocks = stepBeingEdited.actionBlocks.filter(
    (b) => b.id !== blockId,
  );
  dom.actionsListContainer
    .querySelector(`[data-block-id="${blockId}"]`)
    ?.remove();
}

function handleAddNewActionToBlock(blockId, actionType) {
  if (!stepBeingEdited) return;
  const block = stepBeingEdited.actionBlocks.find((b) => b.id === blockId);
  if (!block) return;
  const newAction = {
    id: generateId("action"),
    type: actionType,
    text: "Новое...",
  };
  if (!block.actions) block.actions = [];
  block.actions.push(newAction);
  const blockElement = dom.actionsListContainer.querySelector(
    `[data-block-id="${blockId}"]`,
  );
  blockElement
    .querySelector(".actions-list")
    .appendChild(createActionRowElement(newAction, block.id));
}

function handleDeleteActionFromBlock(blockId, actionId) {
  if (!stepBeingEdited) return;
  const block = stepBeingEdited.actionBlocks.find((b) => b.id === blockId);
  if (!block || !block.actions) return;
  block.actions = block.actions.filter((a) => a.id !== actionId);
  dom.actionsListContainer
    .querySelector(`[data-action-id="${actionId}"]`)
    ?.remove();
}

function handleActionTextEdit(blockId, actionId, newText) {
  if (!stepBeingEdited) return;
  const block = stepBeingEdited.actionBlocks.find((b) => b.id === blockId);
  const action = block?.actions.find((a) => a.id === actionId);
  if (action) action.text = newText;
}

function getParentFolder(folderPath) {
  let folder = currentProfileData;
  if (!folder) return null;
  for (const id of folderPath) {
    if (!folder.children) return null;
    folder = folder.children.find((f) => f.id === id);
    if (!folder) return null;
  }
  return folder;
}

async function handleSave() {
  if (!stepBeingEdited || !currentProfileData) {
    alert("Данные не загружены, сохранение невозможно.");
    return;
  }
  stepBeingEdited.name = dom.nameInput.value.trim();
  stepBeingEdited.descriptionForStep = dom.descriptionInput.value.trim();
  if (!stepBeingEdited.name) {
    alert("Название этапа не может быть пустым");
    return;
  }

  const parentFolder = getParentFolder(currentFolderPathIds);
  if (!parentFolder || !parentFolder.scenarios) {
    alert("Критическая ошибка: не найдена папка со сценариями!");
    return;
  }

  const scenario = parentFolder.scenarios.find((s) => s.id === scenarioId);
  if (!scenario) {
    alert("Критическая ошибка: сценарий не найден при сохранении!");
    return;
  }

  const stepIndex = scenario.steps.findIndex(
    (s) => s.id === stepBeingEdited.id,
  );
  if (stepIndex > -1) {
    scenario.steps[stepIndex] = stepBeingEdited;
  } else {
    if (!scenario.steps) scenario.steps = [];
    scenario.steps.push(stepBeingEdited);
  }

  const result = await window.editorAPI.saveDataAndRefresh(currentProfileData);
  if (result.success) {
    window.close();
  } else {
    alert(`Ошибка сохранения: ${result.error}`);
  }
}

async function initialize() {
  const data = await window.editorAPI.getInitialData();
  if (!data) {
    alert("Не удалось загрузить данные для редактора!");
    window.close();
    return;
  }
  currentProfileData = data.profileData;
  currentFolderPathIds = data.folderPathIds;
  scenarioId = data.scenarioId;
  stepId = data.stepId;
  const parentFolder = getParentFolder(currentFolderPathIds);
  const scenario = parentFolder?.scenarios?.find((s) => s.id === scenarioId);
  if (!scenario) {
    alert("Сценарий не найден!");
    window.close();
    return;
  }
  dom.actionsListContainer.innerHTML = "";
  if (stepId) {
    const originalStep = scenario.steps?.find((s) => s.id === stepId) || {};
    stepBeingEdited = JSON.parse(JSON.stringify(originalStep));
    dom.title.textContent = "Редактировать этап";
  } else {
    stepBeingEdited = {
      id: generateId("step"),
      name: "",
      descriptionForStep: "",
      actionBlocks: [],
    };
    dom.title.textContent = "Новый этап";
  }
  if (!stepBeingEdited.actionBlocks) {
    stepBeingEdited.actionBlocks = [];
  }
  dom.nameInput.value = stepBeingEdited.name || "";
  dom.descriptionInput.value = stepBeingEdited.descriptionForStep || "";
  stepBeingEdited.actionBlocks.forEach((block) => {
    dom.actionsListContainer.appendChild(createActionBlockElement(block));
  });
}

dom.cancelBtn.addEventListener("click", () => window.close());
dom.saveBtn.addEventListener("click", handleSave);
dom.addBlockBtn.addEventListener("click", handleAddActionBlock);
document.addEventListener(
  "keydown",
  (e) => e.key === "Escape" && window.close(),
);

initialize();
