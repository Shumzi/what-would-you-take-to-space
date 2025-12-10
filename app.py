from flask import Flask, render_template, request, jsonify, send_from_directory
import json
import os
from wordcloud import WordCloud
import numpy as np
from PIL import Image
import io
import base64

app = Flask(__name__)

# Configuration
VOTES_FILE = 'votes.json'
WORDCLOUD_PATH = 'static/images/wordcloud.png'
TRANSLATIONS_DIR = 'translations'
MAX_SELECTIONS = 3

# Ensure directories exist
os.makedirs('static/images', exist_ok=True)
os.makedirs('static/css', exist_ok=True)
os.makedirs('static/js', exist_ok=True)
os.makedirs('templates', exist_ok=True)
os.makedirs('translations', exist_ok=True)

def load_votes():
    """Load vote counts from JSON file"""
    if os.path.exists(VOTES_FILE):
        with open(VOTES_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def save_votes(votes):
    """Save vote counts to JSON file"""
    with open(VOTES_FILE, 'w', encoding='utf-8') as f:
        json.dump(votes, f, ensure_ascii=False, indent=2)

def generate_wordcloud(votes, language='en'):
    """Generate word cloud image from vote counts"""
    if not votes or sum(votes.values()) == 0:
        # Create a blank white image instead of trying to generate empty word cloud
        img = Image.new('RGB', (1200, 600), color='white')
        img.save(WORDCLOUD_PATH)
        return WORDCLOUD_PATH
    
    # Load translations to get item names
    try:
        with open(f'{TRANSLATIONS_DIR}/{language}.json', 'r', encoding='utf-8') as f:
            translations = json.load(f)
    except:
        # Fallback to English if translation file not found
        with open(f'{TRANSLATIONS_DIR}/en.json', 'r', encoding='utf-8') as f:
            translations = json.load(f)
    
    # Create word-frequency dictionary
    word_freq = {}
    for item_id, count in votes.items():
        if count > 0:
            # Get translated name for this item
            # item_id is already in format "item1", "item2", etc.
            item_name = translations.get(item_id, f"Item {item_id}")
            word_freq[item_name] = count
    
    # Only generate if we have words
    if not word_freq:
        img = Image.new('RGB', (1200, 600), color='white')
        img.save(WORDCLOUD_PATH)
        return WORDCLOUD_PATH
    
    # Generate word cloud
    # Use appropriate font based on language
    font_path = None
    if language == 'he':
        font_path = 'fonts/DavidLibre-Regular.ttf'
    elif language == 'ar':
        font_path = 'fonts/NotoSansArabic.ttf'
    
    wc = WordCloud(
        width=1200,
        height=600,
        background_color='white',
        font_path=font_path,
        relative_scaling=0.5,
        colormap='viridis'
    ).generate_from_frequencies(word_freq)
    
    # Save to file
    wc.to_file(WORDCLOUD_PATH)
    return WORDCLOUD_PATH

@app.route('/')
def index():
    """Render the voting page"""
    return render_template('index.html')

@app.route('/cloud')
def cloud():
    """Render the word cloud page"""
    return render_template('wordcloud.html')

@app.route('/api/vote', methods=['POST'])
def vote():
    """Handle vote submission"""
    data = request.get_json()
    selected_items = data.get('items', [])
    
    if len(selected_items) > MAX_SELECTIONS:
        return jsonify({'error': f'Maximum {MAX_SELECTIONS} selections allowed'}), 400
    
    # Load current votes
    votes = load_votes()
    
    # Update vote counts
    for item_id in selected_items:
        votes[item_id] = votes.get(item_id, 0) + 1
    
    # Save votes
    save_votes(votes)
    
    # Generate word cloud (default to English for now)
    generate_wordcloud(votes, language='en')
    
    return jsonify({'success': True, 'votes': votes})

@app.route('/api/votes', methods=['GET'])
def get_votes():
    """Get current vote counts"""
    votes = load_votes()
    return jsonify(votes)

@app.route('/api/wordcloud', methods=['GET'])
def get_wordcloud():
    """Generate and return word cloud"""
    language = request.args.get('lang', 'en')
    votes = load_votes()
    generate_wordcloud(votes, language=language)
    return jsonify({'success': True, 'path': '/static/images/wordcloud.png'})

@app.route('/api/translations/<language>', methods=['GET'])
def get_translations(language):
    """Get translations for a specific language"""
    try:
        with open(f'{TRANSLATIONS_DIR}/{language}.json', 'r', encoding='utf-8') as f:
            translations = json.load(f)
        return jsonify(translations)
    except FileNotFoundError:
        return jsonify({'error': 'Translation file not found'}), 404

if __name__ == '__main__':
    # Initialize votes file if it doesn't exist
    if not os.path.exists(VOTES_FILE):
        save_votes({})
    
    # Generate initial word cloud
    votes = load_votes()
    generate_wordcloud(votes)
    
    app.run(debug=True, host='0.0.0.0', port=5000)

