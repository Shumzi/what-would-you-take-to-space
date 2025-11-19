// Page 1 - Object Selection Logic

let currentSelections = [];

// Initialize the page
function init() {
  initI18n();
  loadCurrentSelections();
  renderObjects();
  updateUI();
  setupEventListeners();
}

// Load current session selections
function loadCurrentSelections() {
  currentSelections = getCurrentSession();
}

// Render object buttons
function renderObjects() {
  const grid = document.getElementById('objects-grid');
  grid.innerHTML = '';
  
  OBJECTS_DATA.forEach(obj => {
    const button = document.createElement('button');
    button.className = 'object-btn';
    button.setAttribute('data-id', obj.id);
    button.setAttribute('data-i18n', obj.nameKey);
    button.textContent = t(obj.nameKey);
    
    // Check if already selected
    if (currentSelections.includes(obj.id)) {
      button.classList.add('selected');
    }
    
    button.addEventListener('click', () => toggleSelection(obj.id));
    grid.appendChild(button);
  });
  
  updateButtonStates();
}

// Toggle object selection
function toggleSelection(objectId) {
  const index = currentSelections.indexOf(objectId);
  
  if (index > -1) {
    // Deselect
    currentSelections.splice(index, 1);
  } else {
    // Select (if under limit)
    if (currentSelections.length < MAX_SELECTIONS) {
      currentSelections.push(objectId);
    }
  }
  
  setCurrentSession(currentSelections);
  updateUI();
}

// Update UI based on current state
function updateUI() {
  // Update counter
  document.getElementById('current-count').textContent = currentSelections.length;
  
  // Update GO button state
  const goBtn = document.getElementById('go-btn');
  goBtn.disabled = currentSelections.length === 0;
  
  // Update button states
  updateButtonStates();
}

// Update button states (selected/disabled)
function updateButtonStates() {
  const buttons = document.querySelectorAll('.object-btn');
  const atLimit = currentSelections.length >= MAX_SELECTIONS;
  
  buttons.forEach(button => {
    const objectId = button.getAttribute('data-id');
    const isSelected = currentSelections.includes(objectId);
    
    // Update selected state
    if (isSelected) {
      button.classList.add('selected');
      button.disabled = false;
    } else {
      button.classList.remove('selected');
      button.disabled = atLimit;
    }
  });
}

// Setup event listeners
function setupEventListeners() {
  // Clear all button
  document.getElementById('clear-all-btn').addEventListener('click', () => {
    if (confirm(t('clearAll') + '?')) {
      clearAllData();
      currentSelections = [];
      setCurrentSession(currentSelections);
      updateUI();
    }
  });
  
  // GO button
  document.getElementById('go-btn').addEventListener('click', () => {
    console.log('GO button clicked. Current selections:', currentSelections);
    
    // Save selections to persistent storage
    currentSelections.forEach(objectId => {
      console.log('Incrementing selection for:', objectId);
      incrementSelection(objectId);
    });
    
    // Verify storage
    const counts = getSelectionCounts();
    console.log('Selection counts after save:', counts);
    
    // Navigate to word cloud page
    window.location.href = 'wordcloud.html';
  });
  
  // Language change event
  window.addEventListener('languageChanged', () => {
    renderObjects();
  });
}

// Start the application
document.addEventListener('DOMContentLoaded', init);
