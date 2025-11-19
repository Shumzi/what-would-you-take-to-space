// LocalStorage utility functions

const STORAGE_KEYS = {
  SELECTIONS: 'objectSelections',
  LANGUAGE: 'preferredLanguage',
  CURRENT_SESSION: 'currentSession'
};

// Get selection counts for all objects
function getSelectionCounts() {
  const data = localStorage.getItem(STORAGE_KEYS.SELECTIONS);
  return data ? JSON.parse(data) : {};
}

// Increment selection count for an object
function incrementSelection(objectId) {
  const counts = getSelectionCounts();
  counts[objectId] = (counts[objectId] || 0) + 1;
  console.log('Storage: Incrementing', objectId, 'New count:', counts[objectId]);
  localStorage.setItem(STORAGE_KEYS.SELECTIONS, JSON.stringify(counts));
  console.log('Storage: Saved to localStorage:', counts);
}

// Get current session selections (max 3 items for current selection)
function getCurrentSession() {
  const data = localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION);
  return data ? JSON.parse(data) : [];
}

// Set current session selections
function setCurrentSession(selections) {
  localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, JSON.stringify(selections));
}

// Clear current session (not historical data)
function clearCurrentSession() {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION);
}

// Clear all data (including historical selection counts)
function clearAllData() {
  localStorage.removeItem(STORAGE_KEYS.SELECTIONS);
  localStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION);
}

// Get preferred language
function getLanguage() {
  return localStorage.getItem(STORAGE_KEYS.LANGUAGE) || 'en';
}

// Set preferred language
function setLanguage(lang) {
  localStorage.setItem(STORAGE_KEYS.LANGUAGE, lang);
}
