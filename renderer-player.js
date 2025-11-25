document.addEventListener("DOMContentLoaded", () => {
  let scenarioBeingPlayed = null;
  let currentStepIndex = -1;
  // { stepIndex: { selectedBlockId: "...", completedActionId: "..." } }
  let stepsState = {};

  const dom = {
    stepName: document.getElementById("player-step-name"),
    stepCounter: document.getElementById("player-step-counter"),
    stepDescriptionArea: document.getElementById(
      "player-step-description-area",
    ),
    actionsList: document.getElementById("player-actions-list"),
    prevBtn: document.getElementById("player-prev-btn"),
    nextBtn: document.getElementById("player-next-btn"),
  };

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

  function renderCurrentStep() {
    if (!scenarioBeingPlayed || currentStepIndex < 0) return;
    const step = scenarioBeingPlayed.steps[currentStepIndex];
    if (!step) return;

    if (!stepsState[currentStepIndex]) {
      stepsState[currentStepIndex] = {
        selectedBlockId: null,
        completedActionId: null,
      };
    }
    const currentStepState = stepsState[currentStepIndex];

    dom.stepName.textContent = step.name;
    dom.stepCounter.textContent = `${currentStepIndex + 1} из ${scenarioBeingPlayed.steps.length}`;
    dom.stepDescriptionArea.innerHTML = `<p class="step-description">${step.descriptionForStep || "Нет описания."}</p>`;

    dom.actionsList.innerHTML = "";
    const blocks = step.actionBlocks || [];

    blocks.forEach((block) => {
      const blockDiv = document.createElement("div");
      blockDiv.className = "player-action-block";
      blockDiv.dataset.blockId = block.id;

      if (block.id === currentStepState.selectedBlockId) {
        blockDiv.classList.add("selected");
      }

      if (block.actions && block.actions.length > 0) {
        block.actions.forEach((action) => {
          const actionLine = document.createElement("div");
          actionLine.className = "action-line";
          actionLine.dataset.actionId = action.id;

          if (action.id === currentStepState.completedActionId) {
            actionLine.classList.add("completed");
          }

          actionLine.innerHTML = `
                        <div class="action-line-content">
                            <span class="action-icon">${getActionIcon(action.type)}</span>
                            <span class="action-text">${action.text.replace(/</g, "&lt;")}</span>
                        </div>
                        <span class="action-checkbox"></span>
                    `;
          blockDiv.appendChild(actionLine);
        });
      }
      dom.actionsList.appendChild(blockDiv);
    });
    updateNavButtons();
  }

  function updateNavButtons() {
    dom.prevBtn.classList.toggle("disabled", currentStepIndex === 0);
    dom.nextBtn.classList.toggle(
      "disabled",
      currentStepIndex >= scenarioBeingPlayed.steps.length - 1,
    );
  }

  function nextStep() {
    if (currentStepIndex < scenarioBeingPlayed.steps.length - 1) {
      currentStepIndex++;
      renderCurrentStep();
    }
  }

  function prevStep() {
    if (currentStepIndex > 0) {
      currentStepIndex--;
      renderCurrentStep();
    }
  }

  async function initialize() {
    const data = await window.playerAPI.getInitialData();
    if (data && data.scenario) {
      scenarioBeingPlayed = data.scenario;
      currentStepIndex = 0;
      renderCurrentStep();
    } else {
      dom.stepName.textContent = "Ошибка загрузки";
    }
  }

  // --- НОВАЯ ЛОГИКА ОБРАБОТКИ КЛИКОВ ---
  dom.actionsList.addEventListener("click", (e) => {
    const checkbox = e.target.closest(".action-checkbox");
    const block = e.target.closest(".player-action-block");
    const state = stepsState[currentStepIndex];

    // --- 1. Клик по чекбоксу (высший приоритет) ---
    if (checkbox) {
      e.stopPropagation(); // Не даем событию дойти до блока
      const line = checkbox.closest(".action-line");
      const actionId = line.dataset.actionId;
      const isAlreadyCompleted = state.completedActionId === actionId;

      if (state.completedActionId) {
        const oldLine = dom.actionsList.querySelector(
          `.action-line[data-action-id="${state.completedActionId}"]`,
        );
        if (oldLine) oldLine.classList.remove("completed");
      }

      if (!isAlreadyCompleted) {
        line.classList.add("completed");
        state.completedActionId = actionId;
      } else {
        state.completedActionId = null;
      }
      return;
    }

    // --- 2. Клик по блоку ---
    if (block) {
      const blockId = block.dataset.blockId;
      if (state.selectedBlockId === blockId) {
        return; // Клик по уже активному блоку - ничего не делаем
      }

      // --- Кликнули по ДРУГОМУ блоку ---
      // Снимаем выделение со старого блока
      if (state.selectedBlockId) {
        const oldSelected = dom.actionsList.querySelector(
          `[data-block-id="${state.selectedBlockId}"]`,
        );
        if (oldSelected) oldSelected.classList.remove("selected");
      }
      // Снимаем выделение со старого чекбокса
      if (state.completedActionId) {
        const oldLine = dom.actionsList.querySelector(
          `.action-line[data-action-id="${state.completedActionId}"]`,
        );
        if (oldLine) oldLine.classList.remove("completed");
        state.completedActionId = null;
      }

      // Выделяем новый блок
      block.classList.add("selected");
      state.selectedBlockId = blockId;
      return;
    }

    // --- 3. Клик по пустому месту ---
    if (e.target === dom.actionsList) {
      // Снимаем выделение со старого блока
      if (state.selectedBlockId) {
        const oldSelected = dom.actionsList.querySelector(
          `[data-block-id="${state.selectedBlockId}"]`,
        );
        if (oldSelected) oldSelected.classList.remove("selected");
        state.selectedBlockId = null;
      }
      // Снимаем выделение со старого чекбокса
      if (state.completedActionId) {
        const oldLine = dom.actionsList.querySelector(
          `.action-line[data-action-id="${state.completedActionId}"]`,
        );
        if (oldLine) oldLine.classList.remove("completed");
        state.completedActionId = null;
      }
    }
  });

  dom.nextBtn.addEventListener("click", nextStep);
  dom.prevBtn.addEventListener("click", prevStep);
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") nextStep();
    if (e.key === "ArrowLeft") prevStep();
    if (e.key === "Escape") window.close();
  });

  initialize();
});
