// Internationalization module

let currentTranslations = {};
let currentLanguage = 'en';

// RTL languages
const RTL_LANGUAGES = ['he', 'ar'];

// Embedded translations
const TRANSLATIONS = {
  en: {
    "object1": "Oaergaeargt 1",
    "object2": "Object 2",
    "object3": "Object 3",
    "object4": "Object 4",
    "object5": "Object 5",
    "object6": "Object 6",
    "object7": "Object 7",
    "object8": "Object 8",
    "object9": "Object 9",
    "object10": "Object 10",
    "object11": "Object 11",
    "object12": "Object 12",
    "object13": "Object 13",
    "object14": "Object 14",
    "object15": "Object 15",
    "object16": "Object 16",
    "object17": "Object 17",
    "object18": "Object 18",
    "object19": "Object 19",
    "object20": "Object 20",
    "selectObjects": "Select up to 3 objects",
    "selected": "Selected",
    "clearAll": "Clear All",
    "goToCloud": "GO",
    "backToSelection": "Back to Selection",
    "wordCloud": "Word Cloud",
    "selectionPage": "Objectghjerklj",
    "selectionCounts": "Selection Counts",
    "times": "times"
  },
  he: {
    "object1": "אובייקט 1",
    "object2": "אובייקט 2",
    "object3": "אובייקט 3",
    "object4": "אובייקט 4",
    "object5": "אובייקט 5",
    "object6": "אובייקט 6",
    "object7": "אובייקט 7",
    "object8": "אובייקט 8",
    "object9": "אובייקט 9",
    "object10": "אובייקט 10",
    "object11": "אובייקט 11",
    "object12": "אובייקט 12",
    "object13": "אובייקט 13",
    "object14": "אובייקט 14",
    "object15": "אובייקט 15",
    "object16": "אובייקט 16",
    "object17": "אובייקט 17",
    "object18": "אובייקט 18",
    "object19": "אובייקט 19",
    "object20": "אובייקט 20",
    "selectObjects": "בחר עד 3 אובייקטים",
    "selected": "נבחר",
    "clearAll": "נקה הכל",
    "goToCloud": "המשך",
    "backToSelection": "חזרה לבחירה",
    "wordCloud": "ענן מילים",
    "selectionPage": "בחירת אובייקטים",
    "selectionCounts": "מספר בחירות",
    "times": "פעמים"
  },
  ar: {
    "object1": "كائن 1",
    "object2": "كائن 2",
    "object3": "كائن 3",
    "object4": "كائن 4",
    "object5": "كائن 5",
    "object6": "كائن 6",
    "object7": "كائن 7",
    "object8": "كائن 8",
    "object9": "كائن 9",
    "object10": "كائن 10",
    "object11": "كائن 11",
    "object12": "كائن 12",
    "object13": "كائن 13",
    "object14": "كائن 14",
    "object15": "كائن 15",
    "object16": "كائن 16",
    "object17": "كائن 17",
    "object18": "كائن 18",
    "object19": "كائن 19",
    "object20": "كائن 20",
    "selectObjects": "اختر ما يصل إلى 3 كائنات",
    "selected": "محدد",
    "clearAll": "مسح الكل",
    "goToCloud": "انتقل",
    "backToSelection": "العودة إلى الاختيار",
    "wordCloud": "سحابة الكلمات",
    "selectionPage": "اختيار الكائن",
    "selectionCounts": "عدد التحديدات",
    "times": "مرات"
  }
};

// Load translations for a specific language
function loadTranslations(lang) {
  currentTranslations = TRANSLATIONS[lang] || TRANSLATIONS.en;
  currentLanguage = lang;
  return currentTranslations;
}

// Get translation for a key
function t(key) {
  return currentTranslations[key] || key;
}

// Update page direction based on language
function updatePageDirection() {
  const isRTL = RTL_LANGUAGES.includes(currentLanguage);
  document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
  document.documentElement.setAttribute('lang', currentLanguage);
}

// Update all translatable elements on the page
function updatePageTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    element.textContent = t(key);
  });
  
  // Update placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
    const key = element.getAttribute('data-i18n-placeholder');
    element.placeholder = t(key);
  });
}

// Update active language button
function updateActiveLanguageButton() {
  document.querySelectorAll('[data-lang]').forEach(button => {
    const lang = button.getAttribute('data-lang');
    if (lang === currentLanguage) {
      button.classList.add('active');
    } else {
      button.classList.remove('active');
    }
  });
}

// Switch language
function switchLanguage(lang) {
  loadTranslations(lang);
  setLanguage(lang);
  updatePageDirection();
  updatePageTranslations();
  updateActiveLanguageButton();
  
  // Trigger custom event for pages to react to language change
  window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }));
}

// Initialize i18n system
function initI18n() {
  const savedLang = getLanguage();
  switchLanguage(savedLang);
  
  // Setup language switcher buttons
  document.querySelectorAll('[data-lang]').forEach(button => {
    button.addEventListener('click', () => {
      const lang = button.getAttribute('data-lang');
      switchLanguage(lang);
    });
  });
}
