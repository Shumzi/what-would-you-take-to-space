from flask import Flask, render_template, request, jsonify, send_from_directory
import json
import os
from wordcloud import WordCloud
import numpy as np
from PIL import Image
import io
import base64
import threading
import datetime
import subprocess
import re
import logging
from github import Github
from github.GithubException import GithubException
import requests

app = Flask(__name__)

# Configuration
VOTES_FILE = 'votes.json'
WORDCLOUD_PATH = 'static/images/wordcloud.png'
TRANSLATIONS_DIR = 'translations'
CONFIG_FILE = 'config.json'
BACKUP_STATE_FILE = 'backup_state.json'
MAX_SELECTIONS = 3
BACKUP_BRANCH = 'vote-backups'

# Load configuration
def load_config():
    """Load configuration from JSON file"""
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    # Default configuration
    return {
        'cloud_page_timeout_seconds': 300,
        'reset_selection_timeout_seconds': 300,
        'wordcloud_margin': 10,
        'backup_interval_days': 7
    }

config = load_config()

# Setup logging for backup operations
logging.basicConfig(level=config.get('logging_level', 'INFO'))
logger = logging.getLogger(__name__)

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
            data = json.load(f)
            # Ensure total_submissions exists
            if 'total_submissions' not in data:
                data['total_submissions'] = 0
            return data
    return {'total_submissions': 0}

def save_votes(votes):
    """Save vote counts to JSON file"""
    with open(VOTES_FILE, 'w', encoding='utf-8') as f:
        json.dump(votes, f, ensure_ascii=False, indent=2)
    
    # Check if backup is needed after saving votes (non-blocking)
    try:
        check_and_backup_if_needed()
    except Exception as e:
        logger.error(f"Error checking backup after vote save: {e}")

def generate_wordcloud(votes, language='en'):
    """Generate word cloud image from vote counts"""
    # Filter out total_submissions from vote counts
    vote_counts = {k: v for k, v in votes.items() if k != 'total_submissions'}
    
    if not vote_counts or sum(vote_counts.values()) == 0:
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
    for item_id, count in vote_counts.items():
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
        font_path = 'fonts/EzerEuro-Medium.otf'
    elif language == 'ar':
        # Use Cairo Variable Font - it supports variable weights, we'll use bold weight
        font_path = 'fonts/Cairo-VariableFont.ttf'
    elif language == 'en':
        font_path = 'fonts/EzerEuro-Medium.otf'
    
    # Get margin from config
    margin = config.get('wordcloud_margin', 10)
    
    wc = WordCloud(
        width=1200,
        height=600,
        background_color='white',
        font_path=font_path,
        relative_scaling=0.5,
        colormap='viridis',
        margin=margin
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
    language = data.get('language', 'en')  # Get language from request, default to 'en'
    
    if len(selected_items) > MAX_SELECTIONS:
        return jsonify({'error': f'Maximum {MAX_SELECTIONS} selections allowed'}), 400
    
    # Load current votes
    votes = load_votes()
    
    # Increment total submissions counter
    votes['total_submissions'] = votes.get('total_submissions', 0) + 1
    
    # Update vote counts
    for item_id in selected_items:
        votes[item_id] = votes.get(item_id, 0) + 1
    
    # Save votes
    save_votes(votes)
    
    # Generate word cloud with the user's current language
    generate_wordcloud(votes, language=language)
    
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

@app.route('/api/config', methods=['GET'])
def get_config():
    """Get configuration values"""
    return jsonify(config)

@app.route('/fonts/<path:filename>')
def serve_font(filename):
    """Serve font files from the fonts directory"""
    return send_from_directory('fonts', filename)

# ==================== Backup Functions ====================

def detect_repo_from_git():
    """Try to detect GitHub repository from git remote"""
    try:
        result = subprocess.run(
            ['git', 'remote', 'get-url', 'origin'],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            remote_url = result.stdout.strip()
            # Parse different URL formats
            # https://github.com/owner/repo.git
            # git@github.com:owner/repo.git
            match = re.search(r'github\.com[:/]([^/]+)/([^/]+?)(?:\.git)?$', remote_url)
            if match:
                owner = match.group(1)
                repo_name = match.group(2).rstrip('.git')
                return owner, repo_name
    except Exception as e:
        logger.debug(f"Could not detect repo from git: {e}")
    return None, None

def internet_check():
    """Check if internet connection is available"""
    try:
        response = requests.get('https://api.github.com', timeout=5)
        return response.status_code == 200
    except Exception:
        return False

def load_backup_state():
    """Load backup state from file"""
    if os.path.exists(BACKUP_STATE_FILE):
        try:
            with open(BACKUP_STATE_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error reading backup state: {e}")
    return {}

def save_backup_state(state):
    """Save backup state to file"""
    try:
        with open(BACKUP_STATE_FILE, 'w', encoding='utf-8') as f:
            json.dump(state, f, indent=2, ensure_ascii=False)
    except Exception as e:
        logger.error(f"Error saving backup state: {e}")

def get_last_backup_time():
    """Get the timestamp of the last backup"""
    state = load_backup_state()
    last_backup_str = state.get('last_backup')
    if last_backup_str:
        try:
            return datetime.datetime.fromisoformat(last_backup_str)
        except Exception as e:
            logger.error(f"Error parsing last backup time: {e}")
    return None

def update_last_backup_time():
    """Update the last backup timestamp"""
    state = load_backup_state()
    state['last_backup'] = datetime.datetime.now().isoformat()
    save_backup_state(state)

def should_backup():
    """Check if backup should be performed based on interval"""
    last_backup = get_last_backup_time()
    if last_backup is None:
        return True  # Never backed up
    
    interval_days = config.get('backup_interval_days', 7)
    days_since_backup = (datetime.datetime.now() - last_backup).days
    return days_since_backup >= interval_days

def ensure_backup_branch(github, repo):
    """Ensure the vote-backups branch exists, create it if not"""
    try:
        # Try to get the branch
        repo.get_branch(BACKUP_BRANCH)
        return True
    except GithubException as e:
        if e.status == 404:
            # Branch doesn't exist, create it
            try:
                # Get default branch (usually main or master)
                default_branch = repo.default_branch
                default_branch_ref = repo.get_git_ref(f'heads/{default_branch}')
                default_branch_sha = default_branch_ref.object.sha
                
                # Create new branch from default branch
                repo.create_git_ref(
                    ref=f'refs/heads/{BACKUP_BRANCH}',
                    sha=default_branch_sha
                )
                logger.info(f"Created {BACKUP_BRANCH} branch")
                return True
            except GithubException as create_error:
                # If branch already exists (422), that's fine - we want it to exist
                if create_error.status == 422:
                    logger.info(f"{BACKUP_BRANCH} branch already exists")
                    return True
                logger.error(f"Error creating {BACKUP_BRANCH} branch: {create_error}")
                return False
            except Exception as create_error:
                logger.error(f"Unexpected error creating {BACKUP_BRANCH} branch: {create_error}")
                return False
        else:
            logger.error(f"Error checking for {BACKUP_BRANCH} branch: {e}")
            return False

def upload_to_github():
    """Upload votes.json to GitHub on the vote-backups branch"""
    try:
        # Get GitHub info from backup_state.json first, then config, then environment
        backup_state = load_backup_state()
        token = backup_state.get('github_token') or config.get('github_token') or os.environ.get('GITHUB_TOKEN')
        if not token:
            logger.warning("GitHub token not found in backup_state.json, config, or environment")
            return False
        
        # Get repo info from backup_state.json first, then config, then git
        repo_owner = backup_state.get('github_repo_owner') or config.get('github_repo_owner')
        repo_name = backup_state.get('github_repo_name') or config.get('github_repo_name')
        
        if not repo_owner or not repo_name:
            # Try to detect from git
            detected_owner, detected_name = detect_repo_from_git()
            if detected_owner and detected_name:
                repo_owner = detected_owner
                repo_name = detected_name
            else:
                logger.warning("GitHub repo owner/name not found in backup_state.json, config, or git")
                return False
        
        # Authenticate with GitHub
        github = Github(token)
        repo = github.get_repo(f"{repo_owner}/{repo_name}")
        
        # Ensure backup branch exists
        if not ensure_backup_branch(github, repo):
            logger.error(f"Could not ensure {BACKUP_BRANCH} branch exists")
            return False
        
        # Read votes.json
        if not os.path.exists(VOTES_FILE):
            logger.warning(f"{VOTES_FILE} does not exist, skipping backup")
            return False
        
        with open(VOTES_FILE, 'r', encoding='utf-8') as f:
            votes_content = f.read()
        
        # Use Contents API to create/update file on the backup branch
        backups_path = 'backups/votes.json'
        commit_message = f"Auto-backup votes.json - {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        
        # Try to get existing file on backup branch
        try:
            existing_file = repo.get_contents(backups_path, ref=BACKUP_BRANCH)
            # Update existing file
            repo.update_file(
                path=backups_path,
                message=commit_message,
                content=votes_content,
                sha=existing_file.sha,
                branch=BACKUP_BRANCH
            )
        except GithubException as e:
            if e.status == 404:
                # File doesn't exist, create it
                # First ensure backups directory exists by creating the file
                repo.create_file(
                    path=backups_path,
                    message=commit_message,
                    content=votes_content,
                    branch=BACKUP_BRANCH
                )
            else:
                raise
        
        logger.info(f"Successfully backed up votes.json to {BACKUP_BRANCH} branch")
        return True
        
    except GithubException as e:
        logger.error(f"GitHub API error during backup: {e}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error during backup: {e}")
        return False

def perform_backup():
    """Perform the backup operation if conditions are met"""
    try:
        # Check internet connectivity
        if not internet_check():
            logger.info("No internet connection, skipping backup")
            return
        
        # Check if backup is needed
        if not should_backup():
            logger.debug("Backup not needed yet (within interval)")
            return
        
        # Perform backup
        if upload_to_github():
            update_last_backup_time()
            logger.info("Backup completed successfully")
        else:
            logger.warning("Backup failed, will retry next time")
    except Exception as e:
        logger.error(f"Error in backup process: {e}")

def check_and_backup_if_needed():
    """Check if backup is needed and perform it in a background thread"""
    def backup_thread():
        perform_backup()
    
    thread = threading.Thread(target=backup_thread, daemon=True)
    thread.start()

def force_backup():
    """Force an immediate backup (for debugging/manual trigger)"""
    try:
        # Check internet connectivity
        if not internet_check():
            logger.warning("No internet connection, cannot backup")
            return False
        
        # Perform backup without checking interval
        if upload_to_github():
            update_last_backup_time()
            logger.info("Manual backup completed successfully")
            return True
        else:
            logger.error("Manual backup failed")
            return False
    except Exception as e:
        logger.error(f"Error in manual backup: {e}")
        return False

@app.route('/api/backup', methods=['POST'])
def manual_backup():
    """Manually trigger a backup (for debugging)"""
    try:
        success = force_backup()
        if success:
            return jsonify({'success': True, 'message': 'Backup completed successfully'})
        else:
            return jsonify({'success': False, 'message': 'Backup failed. Check logs for details.'}), 500
    except Exception as e:
        logger.error(f"Error in manual backup endpoint: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

if __name__ == '__main__':
    # Initialize votes file if it doesn't exist, or ensure total_submissions exists
    votes = load_votes()
    if 'total_submissions' not in votes:
        votes['total_submissions'] = 0
        save_votes(votes)
    
    # Generate initial word cloud
    generate_wordcloud(votes)
    
    # Check for backup on startup (non-blocking)
    check_and_backup_if_needed()
    
    app.run(debug=True, host='0.0.0.0', port=5000)

