from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, firestore, auth
import json
import os
import time
import random
from datetime import datetime
import uuid

app = Flask(__name__)
CORS(app)

# Initialize Firebase Admin SDK
def initialize_firebase():
    try:
        # Check if Firebase is already initialized
        firebase_admin.get_app()
        print("Firebase already initialized")
    except ValueError:
        print("Initializing Firebase...")
        # Initialize Firebase Admin SDK
        if os.path.exists('ai-emoji-translator-firebase-adminsdk-fbsvc-70621c3ff6.json'):
            # Local development with JSON file
            print("Using local JSON file for Firebase")
            cred = credentials.Certificate('ai-emoji-translator-firebase-adminsdk-fbsvc-70621c3ff6.json')
            firebase_admin.initialize_app(cred)
        else:
            # Production deployment with environment variables
            print("Using environment variables for Firebase")
            try:
                # Check if all required environment variables are present
                required_vars = [
                    'FIREBASE_PROJECT_ID', 'FIREBASE_PRIVATE_KEY_ID', 'FIREBASE_PRIVATE_KEY',
                    'FIREBASE_CLIENT_EMAIL', 'FIREBASE_CLIENT_ID', 'FIREBASE_AUTH_URI',
                    'FIREBASE_TOKEN_URI', 'FIREBASE_AUTH_PROVIDER_X509_CERT_URL', 'FIREBASE_CLIENT_X509_CERT_URL'
                ]
                
                missing_vars = [var for var in required_vars if not os.getenv(var)]
                if missing_vars:
                    print(f"Missing environment variables: {missing_vars}")
                    raise ValueError(f"Missing required environment variables: {missing_vars}")
                
                cred = credentials.Certificate({
                    "type": "service_account",
                    "project_id": os.getenv('FIREBASE_PROJECT_ID'),
                    "private_key_id": os.getenv('FIREBASE_PRIVATE_KEY_ID'),
                    "private_key": os.getenv('FIREBASE_PRIVATE_KEY').replace('\\n', '\n'),
                    "client_email": os.getenv('FIREBASE_CLIENT_EMAIL'),
                    "client_id": os.getenv('FIREBASE_CLIENT_ID'),
                    "auth_uri": os.getenv('FIREBASE_AUTH_URI'),
                    "token_uri": os.getenv('FIREBASE_TOKEN_URI'),
                    "auth_provider_x509_cert_url": os.getenv('FIREBASE_AUTH_PROVIDER_X509_CERT_URL'),
                    "client_x509_cert_url": os.getenv('FIREBASE_CLIENT_X509_CERT_URL')
                })
                firebase_admin.initialize_app(cred)
                print("Firebase initialized successfully with environment variables")
            except Exception as e:
                print(f"Firebase initialization error: {e}")
                # Fallback to default credentials
                try:
                    firebase_admin.initialize_app()
                    print("Firebase initialized with default credentials")
                except Exception as fallback_error:
                    print(f"Firebase fallback initialization failed: {fallback_error}")
                    raise fallback_error
    
    return firestore.client()

# Lazy initialization - don't initialize at module level
db = None

def get_db():
    global db
    if db is None:
        db = initialize_firebase()
    return db

# Game configuration
GAME_CONFIG = {
    "phrases_per_game": 10,
    "guess_time_seconds": 15,
    "base_points": 1,
    "bonus": {
        "fast_guess_under_5s": 1,
        "fast_guess_under_10s": 0.5
    }
}

# Emoji dictionary
EMOJI_DICTIONARY = {
    "Machine Learning": ["⚙", "📚"],
    "Computer Science": ["💻", "🔬", "📈"],
    "Python": ["🐍", "👨‍💻"],
    "Data Science": ["🗄", "📊", "🧠"],
    "Neural Network": ["🧠", "🔗"],
    "AI": ["🤖", "💡"],
    "Big Data": ["☁️", "🖥", "💥"],
    "Pizza": ["🍕", "🧀"],
    "College": ["🏫", "📖"],
    "Friendship": ["👫", "❤️"],
    "Java": ["☕", "💻"]
}

@app.route('/')
def index():
    return render_template('game.html')

@app.route('/api/game-config')
def get_game_config():
    """Get game configuration"""
    return jsonify({
        'config': GAME_CONFIG,
        'emoji_dictionary': EMOJI_DICTIONARY
    })

@app.route('/api/random-phrase')
def get_random_phrase():
    """Get a random phrase for the game"""
    import random
    phrases = list(EMOJI_DICTIONARY.keys())
    phrase = random.choice(phrases)
    emojis = EMOJI_DICTIONARY[phrase]
    
    return jsonify({
        'phrase': phrase,
        'emojis': emojis
    })

@app.route('/api/validate-answer', methods=['POST'])
def validate_answer():
    """Validate user's answer with improved scoring system"""
    data = request.get_json()
    user_answer = data.get('answer', '').strip().lower()
    correct_phrase = data.get('phrase', '').strip().lower()
    time_taken = data.get('time_taken', 0)
    time_left = data.get('time_left', 0)
    
    is_correct = user_answer == correct_phrase
    
    # Enhanced point calculation system
    points = 0
    if is_correct:
        # Base points for correct answer
        base_points = GAME_CONFIG['base_points']
        
        # Time bonus - more time left = more points
        time_bonus = max(0, time_left)
        
        # Speed bonus for very fast answers
        if time_taken <= 5:
            speed_bonus = GAME_CONFIG['bonus']['fast_guess_under_5s']
        elif time_taken <= 10:
            speed_bonus = GAME_CONFIG['bonus']['fast_guess_under_10s']
        else:
            speed_bonus = 0
        
        # Difficulty bonus (can be extended based on phrase complexity)
        difficulty_bonus = 0
        if len(correct_phrase) > 15:  # Longer phrases are harder
            difficulty_bonus = 1
        
        points = base_points + time_bonus + speed_bonus + difficulty_bonus
    
    return jsonify({
        'correct': is_correct,
        'points': points,
        'base_points': GAME_CONFIG['base_points'] if is_correct else 0,
        'time_bonus': time_left if is_correct else 0,
        'speed_bonus': (GAME_CONFIG['bonus']['fast_guess_under_5s'] if time_taken <= 5 else 
                       GAME_CONFIG['bonus']['fast_guess_under_10s'] if time_taken <= 10 else 0) if is_correct else 0,
        'correct_answer': correct_phrase
    })

@app.route('/api/save-score', methods=['POST'])
def save_score():
    """Save player score to leaderboard with enhanced data tracking"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['player_id', 'player_name', 'score', 'correct_answers', 'total_questions', 'time_taken']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Calculate additional metrics
        accuracy = round((data['correct_answers'] / data['total_questions']) * 100, 2)
        average_time_per_question = round(data['time_taken'] / data['total_questions'], 2)
        
        # Create enhanced leaderboard entry
        leaderboard_entry = {
            'player_id': data['player_id'],
            'player_name': data['player_name'],
            'score': data['score'],
            'points': data['score'],  # For sorting
            'correct_answers': data['correct_answers'],
            'total_questions': data['total_questions'],
            'accuracy': accuracy,
            'time_taken': data['time_taken'],
            'average_time_per_question': average_time_per_question,
            'hints_used': data.get('hints_used', 0),
            'max_hints': data.get('max_hints', 3),
            'game_version': '2.0.0',
            'timestamp': firestore.SERVER_TIMESTAMP,
            'created_at': datetime.utcnow().isoformat(),
            'photo_url': data.get('photo_url', ''),
            'email': data.get('email', '')
        }
        
        # Use player_id as document ID for easier updates
        doc_ref = get_db().collection('leaderboard').document(data['player_id']).set(leaderboard_entry, merge=True)
        
        return jsonify({
            'success': True,
            'message': 'Score saved successfully',
            'player_id': data['player_id'],
            'accuracy': accuracy,
            'rank': 'Calculated after leaderboard update'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/leaderboard')
def get_leaderboard():
    """Get leaderboard data"""
    try:
        # Get top 10 scores
        leaderboard_ref = get_db().collection('leaderboard')
        docs = leaderboard_ref.order_by('score', direction=firestore.Query.DESCENDING).limit(10).stream()
        
        leaderboard = []
        for doc in docs:
            data = doc.to_dict()
            data['id'] = doc.id
            leaderboard.append(data)
        
        return jsonify({
            'success': True,
            'leaderboard': leaderboard
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/player-stats/<player_id>')
def get_player_stats(player_id):
    """Get player statistics"""
    try:
        # Get all games by this player
        games_ref = get_db().collection('leaderboard')
        docs = games_ref.where('player_id', '==', player_id).stream()
        
        games = []
        total_score = 0
        total_correct = 0
        total_questions = 0
        best_score = 0
        fastest_time = float('inf')
        
        for doc in docs:
            data = doc.to_dict()
            games.append(data)
            total_score += data.get('score', 0)
            total_correct += data.get('correct_answers', 0)
            total_questions += data.get('total_questions', 0)
            best_score = max(best_score, data.get('score', 0))
            fastest_time = min(fastest_time, data.get('time_taken', float('inf')))
        
        if fastest_time == float('inf'):
            fastest_time = 0
        
        stats = {
            'total_games': len(games),
            'total_score': total_score,
            'total_correct': total_correct,
            'total_questions': total_questions,
            'best_score': best_score,
            'fastest_time': fastest_time,
            'accuracy': (total_correct / total_questions * 100) if total_questions > 0 else 0
        }
        
        return jsonify({
            'success': True,
            'stats': stats,
            'games': games
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/game-session', methods=['POST'])
def create_game_session():
    """Create a new game session for tracking"""
    try:
        data = request.get_json()
        session_id = f"session_{int(time.time())}_{random.randint(1000, 9999)}"
        
        game_session = {
            'session_id': session_id,
            'player_id': data.get('player_id'),
            'player_name': data.get('player_name', 'Anonymous'),
            'start_time': time.time(),
            'questions': [],
            'current_question': 0,
            'score': 0,
            'hints_used': 0,
            'status': 'active',
            'created_at': datetime.utcnow().isoformat()
        }
        
        # Store in Firestore
        get_db().collection('game_sessions').document(session_id).set(game_session)
        
        return jsonify({
            'success': True,
            'session_id': session_id,
            'game_session': game_session
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/game-session/<session_id>/answer', methods=['POST'])
def submit_session_answer(session_id):
    """Submit an answer for a game session"""
    try:
        data = request.get_json()
        question_phrase = data.get('phrase', '')
        user_answer = data.get('answer', '').strip().lower()
        time_taken = data.get('time_taken', 0)
        time_left = data.get('time_left', 0)
        
        # Validate answer
        correct_answer = question_phrase.lower()
        is_correct = user_answer == correct_answer
        
        # Calculate points using same logic as validate-answer
        points = 0
        if is_correct:
            base_points = GAME_CONFIG['base_points']
            time_bonus = max(0, time_left)
            
            if time_taken <= 5:
                speed_bonus = GAME_CONFIG['bonus']['fast_guess_under_5s']
            elif time_taken <= 10:
                speed_bonus = GAME_CONFIG['bonus']['fast_guess_under_10s']
            else:
                speed_bonus = 0
            
            difficulty_bonus = 1 if len(question_phrase) > 15 else 0
            points = base_points + time_bonus + speed_bonus + difficulty_bonus
        
        # Update game session
        session_ref = get_db().collection('game_sessions').document(session_id)
        session_doc = session_ref.get()
        
        if not session_doc.exists:
            return jsonify({'error': 'Game session not found'}), 404
        
        session_data = session_doc.to_dict()
        session_data['score'] += points
        session_data['current_question'] += 1
        session_data['hints_used'] += data.get('hints_used', 0)
        
        # Add question to session
        session_data['questions'].append({
            'phrase': question_phrase,
            'user_answer': data.get('answer', ''),
            'correct_answer': question_phrase,
            'is_correct': is_correct,
            'points': points,
            'time_taken': time_taken,
            'time_left': time_left,
            'timestamp': time.time()
        })
        
        # Update session in Firestore
        session_ref.set(session_data, merge=True)
        
        return jsonify({
            'success': True,
            'is_correct': is_correct,
            'points': points,
            'total_score': session_data['score'],
            'correct_answer': question_phrase
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/game-session/<session_id>', methods=['GET'])
def get_game_session(session_id):
    """Get game session details"""
    try:
        session_ref = get_db().collection('game_sessions').document(session_id)
        session_doc = session_ref.get()
        
        if not session_doc.exists:
            return jsonify({'error': 'Game session not found'}), 404
        
        session_data = session_doc.to_dict()
        return jsonify({
            'success': True,
            'game_session': session_data
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/game-session/<session_id>/end', methods=['POST'])
def end_game_session(session_id):
    """End a game session and submit final score"""
    try:
        session_ref = get_db().collection('game_sessions').document(session_id)
        session_doc = session_ref.get()
        
        if not session_doc.exists:
            return jsonify({'error': 'Game session not found'}), 404
        
        session_data = session_doc.to_dict()
        session_data['status'] = 'completed'
        session_data['end_time'] = time.time()
        session_data['duration'] = session_data['end_time'] - session_data['start_time']
        
        # Calculate final stats
        correct_answers = sum(1 for q in session_data['questions'] if q['is_correct'])
        total_questions = len(session_data['questions'])
        
        # Update session in Firestore
        session_ref.set(session_data, merge=True)
        
        # Submit to leaderboard
        leaderboard_entry = {
            'player_id': session_data['player_id'],
            'player_name': session_data['player_name'],
            'score': session_data['score'],
            'points': session_data['score'],
            'correct_answers': correct_answers,
            'total_questions': total_questions,
            'accuracy': round((correct_answers / total_questions) * 100, 2) if total_questions > 0 else 0,
            'time_taken': session_data['duration'],
            'hints_used': session_data['hints_used'],
            'timestamp': firestore.SERVER_TIMESTAMP,
            'created_at': datetime.utcnow().isoformat()
        }
        
        # Save to leaderboard
        get_db().collection('leaderboard').document(session_data['player_id']).set(leaderboard_entry, merge=True)
        
        return jsonify({
            'success': True,
            'final_score': session_data['score'],
            'correct_answers': correct_answers,
            'total_questions': total_questions,
            'duration': session_data['duration'],
            'game_session': session_data
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/stats')
def get_game_stats():
    """Get overall game statistics"""
    try:
        # Get total players
        leaderboard_ref = get_db().collection('leaderboard')
        total_players = len(list(leaderboard_ref.stream()))
        
        # Get total sessions
        sessions_ref = get_db().collection('game_sessions')
        total_sessions = len(list(sessions_ref.stream()))
        
        # Get active sessions
        active_sessions = len(list(sessions_ref.where('status', '==', 'active').stream()))
        
        # Get average and highest scores
        if total_players > 0:
            docs = leaderboard_ref.order_by('score', direction=firestore.Query.DESCENDING).limit(1).stream()
            highest_score = 0
            for doc in docs:
                data = doc.to_dict()
                highest_score = data.get('score', 0)
                break
            
            # Calculate average score
            all_docs = leaderboard_ref.stream()
            total_score = sum(doc.to_dict().get('score', 0) for doc in all_docs)
            avg_score = total_score / total_players if total_players > 0 else 0
        else:
            avg_score = 0
            highest_score = 0
        
        return jsonify({
            'success': True,
            'stats': {
                'total_players': total_players,
                'total_sessions': total_sessions,
                'active_sessions': active_sessions,
                'average_score': round(avg_score, 2),
                'highest_score': highest_score
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/health')
def health_check():
    """Health check endpoint"""
    try:
        # Test Firebase connection
        db_test = get_db()
        firebase_connected = True
    except Exception as e:
        firebase_connected = False
        print(f"Firebase connection test failed: {e}")
    
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'firebase_connected': firebase_connected,
        'environment_vars': {
            'FIREBASE_PROJECT_ID': bool(os.getenv('FIREBASE_PROJECT_ID')),
            'FIREBASE_PRIVATE_KEY': bool(os.getenv('FIREBASE_PRIVATE_KEY')),
            'FIREBASE_CLIENT_EMAIL': bool(os.getenv('FIREBASE_CLIENT_EMAIL'))
        }
    })

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
