// Файл: preload-phrase-renderer.js

// --- Ссылки на элементы ---
const body = document.body;
const contentWrapper = document.querySelector(".content-wrapper");
const phraseTextEl = document.getElementById("phrase-text-display");
const phraseTranscriptionEl = document.getElementById(
  "phrase-transcription-display",
);
const phraseActionEl = document.getElementById("phrase-action-display");
const groupPhraseText = document.getElementById("group-phraseText");
const groupTranscription = document.getElementById("group-transcription");
const groupActionText = document.getElementById("group-actionText");
const increaseFontBtn = document.getElementById("increase-font-btn");
const decreaseFontBtn = document.getElementById("decrease-font-btn");
const moneyIcon = document.getElementById("money-icon");

// --- ЛОГИКА ШРИФТА ---
let currentFontSize = 1; // Начальное значение по умолчанию
const FONT_STEP = 0.1;

function updateFontSize() {
  if (contentWrapper) {
    contentWrapper.style.fontSize = `${currentFontSize}em`;
    // Сохраняем новое значение размера шрифта через API
    window.electronPhraseWindowAPI.saveFontSize(currentFontSize);
  }
}

// --- ЗАПОЛНЕНИЕ ДАННЫХ ---
// Используем наше API, "проброшенное" из preload-скрипта
window.electronPhraseWindowAPI.onSetPhraseDetails((event, details) => {
  // Применяем сохраненный размер шрифта при открытии окна
  if (details.fontSize) {
    currentFontSize = details.fontSize;
    contentWrapper.style.fontSize = `${currentFontSize}em`;
  }

  // ... остальная логика заполнения без изменений ...
  if (details.phraseText && groupPhraseText) {
    phraseTextEl.innerHTML = `&bull; ${details.phraseText.replace(/</g, "&lt;").replace(/>/g, "&gt;")} ${details.emoji || ""}`;
    groupPhraseText.style.display = "block";
  } else if (groupPhraseText) {
    groupPhraseText.style.display = "none";
  }
  if (details.transcription && groupTranscription) {
    phraseTranscriptionEl.textContent = `[ ${details.transcription} ]`;
    groupTranscription.style.display = "block";
  } else if (groupTranscription) {
    groupTranscription.style.display = "none";
  }
  if (details.actionText && groupActionText) {
    phraseActionEl.innerHTML = `&bull; ${details.actionText.replace(/</g, "&lt;").replace(/>/g, "&gt;")}`;
    groupActionText.style.display = "block";
  } else if (groupActionText) {
    groupActionText.style.display = "none";
  }
});

// --- ОБРАБОТЧИКИ СОБЫТИЙ ОКНА ---
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    window.close();
  }
});

if (increaseFontBtn) {
  increaseFontBtn.addEventListener("click", () => {
    currentFontSize += FONT_STEP;
    updateFontSize();
  });
}
if (decreaseFontBtn) {
  decreaseFontBtn.addEventListener("click", () => {
    currentFontSize = Math.max(0.5, currentFontSize - FONT_STEP);
    updateFontSize();
  });
}
// Клик для смены темы теперь только на иконке
if (moneyIcon) {
  moneyIcon.addEventListener("click", () => {
    body.classList.toggle("dark-theme");
  });
}
