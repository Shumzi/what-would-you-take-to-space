# Space Items Voting App

A Flask-based web application for voting on items to take to space, with a word cloud visualization of results.

## Features

- **Voting Page**: 14-item grid where users can select up to 3 items
- **Word Cloud Visualization**: Dynamic word cloud showing vote counts proportional to item popularity
- **Multi-language Support**: English, Hebrew, and Arabic with RTL support
- **Simple Data Storage**: JSON file for vote counts (no database required)

## Setup

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)

### Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Run the application:
```bash
python app.py
```

3. Open your browser and navigate to:
```
http://localhost:5000
```

## Project Structure

```
to_space/
├── app.py                 # Flask application
├── requirements.txt       # Python dependencies
├── votes.json            # Vote storage (auto-created)
├── doc/                  # general documentation from museum regarding project.
├── fonts/                # fonts for hebrew and arabic.
├── static/
│   ├── css/
│   │   ├── main.css      # Main stylesheet
│   │   └── grid.css      # Grid-specific styles
│   ├── js/
│   │   └── app.js        # Frontend logic
│   └── images/
│       └── wordcloud.png # Generated word cloud
├── templates/
│   ├── index.html        # Voting page
│   └── wordcloud.html    # Word cloud page
└── translations/
    ├── en.json           # English translations
    ├── he.json           # Hebrew translations
    └── ar.json           # Arabic translations
```

## Customization

### Styling

The CSS files are designed to be designer-friendly:

- **`static/css/main.css`**: Contains CSS variables at the top for easy customization (colors, fonts, spacing, etc.)
- **`static/css/grid.css`**: Grid-specific styles with customizable variables

Modify the CSS variables in `main.css` to change the appearance without touching the rest of the code.

### Translations

Edit the JSON files in `translations/` to modify text content:
- `translations/en.json` - English
- `translations/he.json` - Hebrew
- `translations/ar.json` - Arabic

## API Endpoints

- `GET /` - Voting page
- `GET /cloud` - Word cloud visualization page
- `POST /api/vote` - Submit votes (expects JSON: `{"items": ["item1", "item2", "item3"]}`)
- `GET /api/votes` - Get current vote counts
- `GET /api/wordcloud?lang=en` - Generate word cloud for specified language
- `GET /api/translations/<language>` - Get translations for a language

## Data Storage

Votes are stored in `votes.json` with the following structure:
```json
{
  "item1": 5,
  "item2": 3,
  "item3": 10,
  ...
}
```

## Notes

- The word cloud is generated server-side using the Python `wordcloud` library
- Fonts for Hebrew and Arabic are automatically used when generating word clouds in those languages
- The app uses localStorage to remember the user's language preference

