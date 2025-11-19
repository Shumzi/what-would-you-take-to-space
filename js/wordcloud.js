// Page 2 - Word Cloud Logic (using d3-cloud)

// Color palette from CSS variables
const WORD_COLORS = [
  '#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c',
  '#e67e22', '#34495e', '#16a085', '#c0392b', '#8e44ad', '#2980b9'
];

// Get random color from palette
function getRandomColor() {
  return WORD_COLORS[Math.floor(Math.random() * WORD_COLORS.length)];
}

// Initialize the page
function init() {
  console.log('Word cloud page initializing...');
  console.log('STORAGE_KEYS available:', typeof STORAGE_KEYS !== 'undefined');
  if (typeof STORAGE_KEYS !== 'undefined') {
    console.log('STORAGE_KEYS.SELECTIONS:', STORAGE_KEYS.SELECTIONS);
  }
  
  initI18n();
  
  // Wait a bit for i18n to fully initialize before generating cloud
  setTimeout(() => {
    generateWordCloud();
    displaySelectionCounts();
  }, 100);
  
  // Regenerate cloud on language change
  window.addEventListener('languageChanged', () => {
    generateWordCloud();
    displaySelectionCounts();
  });
}

// Display selection counts for debugging
function displaySelectionCounts() {
  const selectionCounts = getSelectionCounts();
  console.log('Word Cloud - Selection counts from storage:', selectionCounts);
  
  const debugContainer = document.getElementById('debug-counts');
  
  if (!debugContainer) return;
  
  if (Object.keys(selectionCounts).length === 0) {
    debugContainer.innerHTML = '<p><em>No selections yet</em></p>';
    return;
  }
  
  let html = '<ul>';
  OBJECTS_DATA.forEach(obj => {
    const count = selectionCounts[obj.id] || 0;
    if (count > 0) {
      html += `<li><strong>${t(obj.nameKey)}</strong>: ${count} ${t('times')}</li>`;
    }
  });
  html += '</ul>';
  
  debugContainer.innerHTML = html;
}

// Generate word cloud using d3-cloud
function generateWordCloud() {
  const canvas = document.getElementById('wordcloud-canvas');
  const container = canvas.parentElement;
  // Get computed style for accurate pixel size
  const rect = container.getBoundingClientRect();
  const width = Math.floor(rect.width);
  const height = Math.floor(rect.height);
  canvas.setAttribute('width', width);
  canvas.setAttribute('height', height);
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  
  console.log('Canvas size:', width, 'x', height);
  
  // Get selection counts
  const selectionCounts = getSelectionCounts();
  console.log('Selection counts:', selectionCounts);
  
  // Calculate max count for scaling
  const countsArray = Object.values(selectionCounts);
  const maxCount = countsArray.length > 0 ? Math.max(...countsArray) : 1;
  const hasSelections = Object.keys(selectionCounts).length > 0;
  
  console.log('Max count:', maxCount, 'Has selections:', hasSelections);
  
  // Prepare word data with sizes
  const words = OBJECTS_DATA.map(obj => {
    const count = selectionCounts[obj.id] || 0;
    let size;
    if (!hasSelections) {
      size = 40; // All equal when no selections - much larger base size
    } else if (count > 0) {
      // Scale selected items: more selections = bigger size
      size = 30 + (count / maxCount) * 90; // Range: 30-120 based on count
    } else {
      size = 20; // Unselected items
    }
    
    return {
      text: t(obj.nameKey),
      size: size
    };
  });
  
  console.log('Word data:', words);
  
  // Check if current language is RTL
  const isRTL = currentLanguage === 'he' || currentLanguage === 'ar';
  
  // Clear canvas
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, width, height);
  
  // Create d3-cloud layout with better settings
  const layout = d3.layout.cloud()
    .size([width, height])
    .words(words)
    .padding(10) // More padding to absolutely prevent overlap
    .rotate(() => {
      // No rotation for RTL, random rotation for LTR
      if (isRTL) return 0;
      const angles = [-60, -45, -30, 0, 30, 45, 60]; // More rotation angles
      return angles[Math.floor(Math.random() * angles.length)];
    })
    .font('Arial')
    .fontSize(d => d.size)
    .spiral('rectangular') // Rectangular spiral fills canvas better
    .random(() => 0.5) // Deterministic layout
    .on('end', drawWords);
  
  layout.start();
  
  // Draw words on canvas
  function drawWords(words) {
    console.log('Drawing', words.length, 'words');
    
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    words.forEach(word => {
      ctx.save();
      ctx.translate(word.x, word.y);
      ctx.rotate(word.rotate * Math.PI / 180);
      ctx.font = `${word.size}px Arial`;
      ctx.fillStyle = getRandomColor();
      
      // For RTL text, set direction
      if (isRTL) {
        ctx.direction = 'rtl';
      }
      
      ctx.fillText(word.text, 0, 0);
      ctx.restore();
    });
    
    ctx.restore();
  }
}

// Handle window resize
let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    generateWordCloud();
  }, 300);
});

// Start the application
document.addEventListener('DOMContentLoaded', init);
