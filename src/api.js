export async function loadProfilesList() {
  return window.electronAPI.loadProfilesList();
}
export async function loadProfileData(profileInfo) {
  return window.electronAPI.loadProfileData(profileInfo);
}
export async function deleteProfileFile(profileInfo) {
  return window.electronAPI.deleteProfileFile(profileInfo);
}
export function openPlayerWindow(data) {
  window.electronAPI.openPlayerWindow(data);
}
export async function saveProfileData(profileData) {
  return window.electronAPI.saveProfileData(profileData);
}
export async function saveProfilesList(profilesList) {
  return window.electronAPI.saveProfilesList(profilesList);
}
export async function updateProfileNameInFile(profileInfo, newName) {
  return window.electronAPI.updateProfileNameInFile(profileInfo, newName);
}
export function showPhraseInNewWindow(phraseDetails) {
  window.electronAPI.showPhraseInNewWindow(phraseDetails);
}
export async function copyImageToApp(sourceFilePath) {
  return window.electronAPI.copyImageToApp(sourceFilePath);
}
export async function deleteAppImage(fileName) {
  return window.electronAPI.deleteAppImage(fileName);
}
export async function showOpenImageDialog() {
  return window.electronAPI.showOpenImageDialog();
}
export function openPhraseEditorWindow(data) {
  window.electronAPI.openPhraseEditorWindow(data);
}

export function onDataUpdated(callback) {
  window.electronAPI.onDataUpdated(callback);
}
// api.js
export function openStepEditorWindow(data) {
  window.electronAPI.openStepEditorWindow(data);
}
