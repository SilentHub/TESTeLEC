export let profilesList = [];
export let currentProfileData = null;
export let currentProfileInfo = null;
export let currentFolderPathIds = [];
export let adminAccessGranted = false;
export let previouslySelectedRandomPhraseElement = null;
export let isSearchViewActive = false;
export let currentCustomModalResolve = null;
export let editingItemId = null;
export let currentPhraseImageSourcePath = null;
export let imageActionOnSave = null;
export let stepBeingEdited = null;
export let viewingScenarioId = null;
export let scenarioBeingPlayed = null; // <-- ДОБАВЬТЕ
export let currentStepIndex = -1; // <-- ДОБАВЬТЕ
export let isFavoritesViewActive = false;

export function setProfilesList(newList) {
  profilesList = newList;
}
export function setCurrentProfileData(data) {
  currentProfileData = data;
}
export function setCurrentProfileInfo(info) {
  currentProfileInfo = info;
}
export function setCurrentFolderPathIds(path) {
  currentFolderPathIds = path;
}
export function setAdminAccessGranted(value) {
  adminAccessGranted = value;
}
export function setPreviouslySelectedRandomPhraseElement(element) {
  previouslySelectedRandomPhraseElement = element;
}
export function setSearchViewActive(value) {
  isSearchViewActive = value;
}
export function setCurrentCustomModalResolve(resolve) {
  currentCustomModalResolve = resolve;
}
export function setEditingItemId(id) {
  editingItemId = id;
}
export function setCurrentPhraseImageSourcePath(path) {
  currentPhraseImageSourcePath = path;
}
export function setImageActionOnSave(action) {
  imageActionOnSave = action;
}
export function setStepBeingEdited(step) {
  stepBeingEdited = step;
}
export function setViewingScenarioId(id) {
  viewingScenarioId = id;
}
export function setScenarioBeingPlayed(scenario) {
  scenarioBeingPlayed = scenario;
}
export function setCurrentStepIndex(index) {
  currentStepIndex = index;
}
export function setFavoritesViewActive(value) {
  isFavoritesViewActive = value;
}
