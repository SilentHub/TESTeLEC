import * as state from "./state.js";
import * as dom from "./dom.js";
import * as modals from "./modals.js";

// --- Вспомогательные функции ---

let currentHighlightedAction = null;

function getActionIcon(actionType) {
  switch (actionType) {
    case "say":
      return "💬";
    case "do":
      return "🎬";
    case "emote":
      return "🔥";
    default:
      return "➡️";
  }
}

function highlightAction(element) {
  if (currentHighlightedAction) {
    currentHighlightedAction.classList.remove("highlighted");
  }
  element.classList.add("highlighted");
  currentHighlightedAction = element;
}

// --- Основная логика плеера ---

export function renderCurrentStep() {
  if (!state.scenarioBeingPlayed || state.currentStepIndex < 0) {
    return;
  }

  const scenario = state.scenarioBeingPlayed;
  const step = scenario.steps[state.currentStepIndex];

  if (!step) {
    closePlayer();
    return;
  }

  dom.playerStepName.textContent = step.name;
  dom.playerStepCounter.textContent = `${state.currentStepIndex + 1} из ${
    scenario.steps.length
  }`;
  dom.playerStepDescription.textContent =
    step.descriptionForStep || "Нет описания для этого этапа.";

  dom.playerActionsList.innerHTML = "";
  currentHighlightedAction = null;

  // Новая логика для отрисовки блоков
  const blocks = step.actionBlocks || [];

  if (blocks.length > 0) {
    blocks.forEach((block) => {
      const blockDiv = document.createElement("div");
      blockDiv.className = "player-action-block";
      blockDiv.onclick = () => highlightAction(blockDiv);

      if (block.actions && block.actions.length > 0) {
        block.actions.forEach((action) => {
          const actionDiv = document.createElement("div");
          actionDiv.className = "player-action-item";
          actionDiv.innerHTML = `
            <span class="icon">${getActionIcon(action.type)}</span>
            <span class="action-text">${action.text.replace(/</g, "&lt;")}</span>
          `;
          blockDiv.appendChild(actionDiv);
        });
      }
      dom.playerActionsList.appendChild(blockDiv);
    });
  }
  // Совместимость со старой структурой данных (без блоков)
  else if (step.actions && step.actions.length > 0) {
    const blockDiv = document.createElement("div");
    blockDiv.className = "player-action-block";
    blockDiv.onclick = () => highlightAction(blockDiv);

    step.actions.forEach((action) => {
      const actionDiv = document.createElement("div");
      actionDiv.className = "player-action-item";
      actionDiv.innerHTML = `
        <span class="icon">${getActionIcon(action.type)}</span>
        <span class="action-text">${action.text.replace(/</g, "&lt;")}</span>
      `;
      blockDiv.appendChild(actionDiv);
    });
    dom.playerActionsList.appendChild(blockDiv);
  } else {
    dom.playerActionsList.innerHTML = `<p class="empty-folder-message">В этом этапе нет действий.</p>`;
  }

  dom.playerPrevStepBtn.disabled = state.currentStepIndex === 0;
  dom.playerNextStepBtn.disabled =
    state.currentStepIndex >= scenario.steps.length - 1;
}

export function openPlayer(scenario) {
  if (!scenario || !scenario.steps || scenario.steps.length === 0) {
    modals.showAlert("Сценарий пуст, его нельзя запустить.");
    return;
  }

  state.setScenarioBeingPlayed(scenario);
  state.setCurrentStepIndex(0);
  renderCurrentStep();
  dom.scenarioPlayerOverlay.style.display = "flex";
}

export function closePlayer() {
  if (dom.scenarioPlayerOverlay) {
    dom.scenarioPlayerOverlay.style.display = "none";
  }
  state.setScenarioBeingPlayed(null);
  state.setCurrentStepIndex(-1);
  if (dom.playerActionsList) {
    dom.playerActionsList.innerHTML = "";
  }
}

export function nextStep() {
  if (
    state.scenarioBeingPlayed &&
    state.currentStepIndex < state.scenarioBeingPlayed.steps.length - 1
  ) {
    state.setCurrentStepIndex(state.currentStepIndex + 1);
    renderCurrentStep();
  }
}

export function prevStep() {
  if (state.scenarioBeingPlayed && state.currentStepIndex > 0) {
    state.setCurrentStepIndex(state.currentStepIndex - 1);
    renderCurrentStep();
  }
}

export function setupPlayerEventListeners() {
  if (dom.playerNextStepBtn)
    dom.playerNextStepBtn.addEventListener("click", nextStep);
  if (dom.playerPrevStepBtn)
    dom.playerPrevStepBtn.addEventListener("click", prevStep);
  if (dom.playerCloseBtn)
    dom.playerCloseBtn.addEventListener("click", closePlayer);

  document.addEventListener("keydown", (e) => {
    if (!state.scenarioBeingPlayed) return;

    if (e.key === "ArrowRight") {
      e.preventDefault();
      nextStep();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      prevStep();
    } else if (e.key === "Escape") {
      e.preventDefault();
      closePlayer();
    }
  });
}
