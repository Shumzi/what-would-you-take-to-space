// ============================================
// APPLICATION CONFIGURATION
// ============================================

const MAX_SELECTIONS = 3;
const TOTAL_ITEMS = 13;
const ITEM_IDS = Array.from({ length: TOTAL_ITEMS }, (_, i) => `item${i + 1}`);

// ============================================
// STATE MANAGEMENT
// ============================================

let currentLanguage = localStorage.getItem('language') || 'en';
let translations = {};
let selectedItems = [];

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    await loadTranslations(currentLanguage);
    setupLanguageSwitcher();
    
    // Check if we're on the voting page or word cloud page
    if (document.getElementById('objects-grid')) {
        initializeVotingPage();
    }
}

// ============================================
// TRANSLATION SYSTEM
// ============================================

async function loadTranslations(lang) {
    try {
        const response = await fetch(`/api/translations/${lang}`);
        if (!response.ok) throw new Error('Failed to load translations');
        translations = await response.json();
        currentLanguage = lang;
        localStorage.setItem('language', lang);
        applyTranslations();
        updateDocumentDirection(lang);
        
        // Dispatch event for word cloud page
        document.dispatchEvent(new CustomEvent('languageChanged', { 
            detail: { language: lang } 
        }));
    } catch (error) {
        console.error('Error loading translations:', error);
    }
}

function applyTranslations() {
    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (translations[key]) {
            if (element.tagName === 'INPUT' && element.type === 'submit') {
                element.value = translations[key];
            } else {
                element.textContent = translations[key];
            }
        }
    });
}

function updateDocumentDirection(lang) {
    document.documentElement.lang = lang;
    document.documentElement.dir = ['he', 'ar'].includes(lang) ? 'rtl' : 'ltr';
}

function setupLanguageSwitcher() {
    const langButtons = document.querySelectorAll('.lang-btn');
    langButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const lang = btn.getAttribute('data-lang');
            switchLanguage(lang);
            
            // Update active state
            langButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    
    // Set initial active state
    langButtons.forEach(btn => {
        if (btn.getAttribute('data-lang') === currentLanguage) {
            btn.classList.add('active');
        }
    });
}

async function switchLanguage(lang) {
    await loadTranslations(lang);
    
    // Re-render grid if we're on the voting page to update button text
    if (document.getElementById('objects-grid')) {
        renderGrid();
        // Restore selection state after re-rendering
        updateUI();
    }
}

// ============================================
// VOTING PAGE FUNCTIONALITY
// ============================================

function initializeVotingPage() {
    renderGrid();
    setupEventListeners();
    updateUI();
}

function renderGrid() {
    const grid = document.getElementById('objects-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    grid.className = 'objects-grid layout-7x2'; // 7 columns, 2 rows for 13 items
    
    ITEM_IDS.forEach(itemId => {
        const button = document.createElement('button');
        button.className = 'grid-item';
        button.id = itemId;
        button.setAttribute('data-item-id', itemId);
        
        // Get translated name
        const itemKey = itemId.replace('item', 'item');
        const itemName = translations[itemKey] || itemId;
        button.textContent = itemName;
        
        button.addEventListener('click', () => handleItemClick(itemId));
        grid.appendChild(button);
    });
}

function handleItemClick(itemId) {
    const index = selectedItems.indexOf(itemId);
    
    if (index > -1) {
        // Deselect item
        selectedItems.splice(index, 1);
    } else {
        // Select item (if under limit)
        if (selectedItems.length < MAX_SELECTIONS) {
            selectedItems.push(itemId);
        } else {
            // Show feedback that max selections reached
            return;
        }
    }
    
    updateUI();
}

function updateUI() {
    // Update selection count
    const countElement = document.getElementById('current-count');
    if (countElement) {
        countElement.textContent = selectedItems.length;
    }
    
    // Update grid items
    ITEM_IDS.forEach(itemId => {
        const button = document.getElementById(itemId);
        if (button) {
            const isSelected = selectedItems.includes(itemId);
            button.classList.toggle('selected', isSelected);
            
            // Disable items if max selections reached and item is not selected
            if (!isSelected && selectedItems.length >= MAX_SELECTIONS) {
                button.disabled = true;
            } else {
                button.disabled = false;
            }
        }
    });
    
    // Update submit button - only enable when exactly 3 items are selected
    const submitBtn = document.getElementById('submit-btn');
    if (submitBtn) {
        submitBtn.disabled = selectedItems.length !== MAX_SELECTIONS;
    }
}

function setupEventListeners() {
    // Submit button
    const submitBtn = document.getElementById('submit-btn');
    if (submitBtn) {
        submitBtn.addEventListener('click', handleSubmit);
    }
    
    // Clear button
    const clearBtn = document.getElementById('clear-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', handleClear);
    }
}

async function handleSubmit() {
    if (selectedItems.length === 0) return;
    
    const submitBtn = document.getElementById('submit-btn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = translations.loading || 'Submitting...';
    }
    
    try {
        const response = await fetch('/api/vote', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                items: selectedItems
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to submit votes');
        }
        
        const data = await response.json();
        
        // Clear selections
        selectedItems = [];
        updateUI();
        
        // Redirect to word cloud page
        window.location.href = '/cloud';
        
    } catch (error) {
        console.error('Error submitting votes:', error);
        alert('Failed to submit votes. Please try again.');
        
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = translations.goToCloud || 'Submit';
        }
    }
}

function handleClear() {
    selectedItems = [];
    updateUI();
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function t(key) {
    return translations[key] || key;
}

