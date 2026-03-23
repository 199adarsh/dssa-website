from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, firestore, auth
import json
import random
import time
from datetime import datetime
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize Firebase Admin SDK
def initialize_firebase():
    try:
        # Check if Firebase is already initialized
        firebase_admin.get_app()
        print("Firebase already initialized")
    except ValueError:
        print("Initializing Firebase...")
        # Initialize Firebase Admin SDK
        if os.path.exists('techguess-pro-dssa-firebase-adminsdk-fbsvc-0b33757bce.json'):
            # Local development with JSON file
            print("Using local JSON file for Firebase")
            cred = credentials.Certificate('techguess-pro-dssa-firebase-adminsdk-fbsvc-0b33757bce.json')
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

# Load questions from JSON file
def load_questions():
    try:
        with open('questions.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data['questions']
    except FileNotFoundError:
        # Fallback questions if JSON file is not found
        return [
            {
                "id": 1,
                "question": "What does HTML stand for?",
                "answer": "HyperText Markup Language",
                "hints": [
                    "It's a markup language for web pages",
                    "Starts with 'Hyper' and ends with 'Language'",
                    "Used to structure content on the web"
                ],
                "category": "Web Development",
                "difficulty": "Easy"
            }
        ]

# Game configuration
GAME_CONFIG = {
    "questions_per_game": 10,
    "time_per_question": 10,
    "base_points": 2,
    "expert_base_points": 3,
    "bonus": {
        "fast_answer_under_5s": 1,
        "fast_answer_under_8s": 0.5
    }
}

@app.route('/')
def index():
    """Serve the main game page"""
    return render_template('game.html')

@app.route('/events')
def events():
    """Serve the events page"""
    try:
        return app.send_static_file('../events.html')
    except:
        return "Events page not found", 404

@app.route('/team')
def team():
    """Serve the team page"""
    try:
        return app.send_static_file('../team.html')
    except:
        return "Team page not found", 404

@app.route('/alumni')
def alumni():
    """Serve the alumni page"""
    try:
        return app.send_static_file('../alumni.html')
    except:
        return "Alumni page not found", 404

@app.route('/contact')
def contact():
    """Serve the contact page"""
    try:
        return app.send_static_file('../contact.html')
    except:
        return "Contact page not found", 404

@app.route('/api/questions', methods=['GET'])
def get_questions():
    """Get random questions for the game"""
    try:
        questions = load_questions()
        count = request.args.get('count', 10, type=int)
        
        # Shuffle and select random questions
        random.shuffle(questions)
        selected_questions = questions[:count]
        
        # Remove answers from questions sent to client
        for question in selected_questions:
            question.pop('answer', None)
        
        return jsonify({
            'success': True,
            'questions': selected_questions,
            'total': len(selected_questions)
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/questions/<int:question_id>', methods=['GET'])
def get_question(question_id):
    """Get a specific question by ID"""
    try:
        questions = load_questions()
        question = next((q for q in questions if q['id'] == question_id), None)
        
        if not question:
            return jsonify({
                'success': False,
                'error': 'Question not found'
            }), 404
        
        return jsonify({
            'success': True,
            'question': question
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/verify-answer', methods=['POST'])
def verify_answer():
    """Verify if the submitted answer is correct"""
    try:
        data = request.get_json()
        question_id = data.get('question_id')
        user_answer = data.get('answer', '').strip().lower()
        
        if not question_id or not user_answer:
            return jsonify({
                'success': False,
                'error': 'Missing question_id or answer'
            }), 400
        
        questions = load_questions()
        question = next((q for q in questions if q['id'] == question_id), None)
        
        if not question:
            return jsonify({
                'success': False,
                'error': 'Question not found'
            }), 404
        
        correct_answer = question['answer'].lower()
        is_correct = user_answer == correct_answer
        
        return jsonify({
            'success': True,
            'is_correct': is_correct,
            'correct_answer': question['answer'],
            'user_answer': data.get('answer', ''),
            'question_id': question_id
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/hint/<int:question_id>', methods=['GET'])
def get_hint(question_id):
    """Get a hint for a specific question"""
    try:
        questions = load_questions()
        question = next((q for q in questions if q['id'] == question_id), None)
        
        if not question:
            return jsonify({
                'success': False,
                'error': 'Question not found'
            }), 404
        
        hint_index = request.args.get('index', 0, type=int)
        hints = question.get('hints', [])
        
        if hint_index >= len(hints):
            return jsonify({
                'success': False,
                'error': 'No more hints available'
            }), 400
        
        return jsonify({
            'success': True,
            'hint': hints[hint_index],
            'hint_index': hint_index,
            'total_hints': len(hints),
            'remaining_hints': len(hints) - hint_index - 1
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/leaderboard/fastest', methods=['GET'])
def get_fastest_leaderboard():
    """Get fastest completion leaderboard"""
    try:
        limit = request.args.get('limit', 10, type=int)
        
        # Filter sessions that have duration data
        sessions_with_duration = [session for session in game_sessions.values() 
                                if session.get('status') == 'completed' and 'duration' in session]
        
        # Sort by duration (ascending - fastest first)
        sorted_sessions = sorted(sessions_with_duration, key=lambda x: x['duration'])
        
        # Format for leaderboard display
        fastest_leaderboard = []
        for session in sorted_sessions[:limit]:
            correct_answers = sum(1 for q in session['questions'] if q['is_correct'])
            total_questions = len(session['questions'])
            
            # Calculate end_time if not present
            end_time = session.get('end_time', session['start_time'] + session.get('duration', 0))
            
            fastest_leaderboard.append({
                'player_name': session['player_name'],
                'player_id': session['player_id'],
                'score': session['score'],
                'correct_answers': correct_answers,
                'total_questions': total_questions,
                'duration': round(session['duration'], 2),
                'timestamp': end_time,
                'date': datetime.fromtimestamp(end_time).isoformat(),
                'photo_url': session.get('photo_url', ''),
                'session_id': session['session_id']
            })
        
        return jsonify({
            'success': True,
            'leaderboard': fastest_leaderboard,
            'total_sessions': len(sessions_with_duration)
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/leaderboard/most-correct', methods=['GET'])
def get_most_correct_leaderboard():
    """Get most correct answers leaderboard"""
    try:
        limit = request.args.get('limit', 10, type=int)
        
        # If leaderboard is empty, try to get data from completed sessions
        if not leaderboard:
            # Get completed sessions and convert to leaderboard format
            completed_sessions = [session for session in game_sessions.values() 
                                if session.get('status') == 'completed']
            
            for session in completed_sessions:
                correct_answers = sum(1 for q in session['questions'] if q['is_correct'])
                total_questions = len(session['questions'])
                
                # Calculate end_time if not present
                end_time = session.get('end_time', session['start_time'] + session.get('duration', 0))
                
                leaderboard.append({
                    'player_name': session['player_name'],
                    'player_id': session['player_id'],
                    'score': session['score'],
                    'correct_answers': correct_answers,
                    'total_questions': total_questions,
                    'timestamp': end_time,
                    'date': datetime.fromtimestamp(end_time).isoformat(),
                    'photo_url': session.get('photo_url', ''),
                    'session_id': session['session_id']
                })
        
        # Sort leaderboard by correct answers (descending) and score (descending for tie-breaking)
        sorted_leaderboard = sorted(leaderboard, key=lambda x: (-x['correct_answers'], -x['score']))
        
        return jsonify({
            'success': True,
            'leaderboard': sorted_leaderboard[:limit],
            'total_players': len(leaderboard)
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/leaderboard/accuracy', methods=['GET'])
def get_accuracy_leaderboard():
    """Get accuracy-based leaderboard"""
    try:
        limit = request.args.get('limit', 10, type=int)
        
        # If leaderboard is empty, try to get data from completed sessions
        if not leaderboard:
            # Get completed sessions and convert to leaderboard format
            completed_sessions = [session for session in game_sessions.values() 
                                if session.get('status') == 'completed']
            
            for session in completed_sessions:
                correct_answers = sum(1 for q in session['questions'] if q['is_correct'])
                total_questions = len(session['questions'])
                
                # Calculate end_time if not present
                end_time = session.get('end_time', session['start_time'] + session.get('duration', 0))
                
                leaderboard.append({
                    'player_name': session['player_name'],
                    'player_id': session['player_id'],
                    'score': session['score'],
                    'correct_answers': correct_answers,
                    'total_questions': total_questions,
                    'timestamp': end_time,
                    'date': datetime.fromtimestamp(end_time).isoformat(),
                    'photo_url': session.get('photo_url', ''),
                    'session_id': session['session_id']
                })
        
        # Calculate accuracy for each player
        players_with_accuracy = []
        for player in leaderboard:
            if player['total_questions'] > 0:
                accuracy = (player['correct_answers'] / player['total_questions']) * 100
                player_with_accuracy = player.copy()
                player_with_accuracy['accuracy'] = round(accuracy, 2)
                players_with_accuracy.append(player_with_accuracy)
        
        # Sort by accuracy (descending) and score (descending for tie-breaking)
        sorted_leaderboard = sorted(players_with_accuracy, key=lambda x: (-x['accuracy'], -x['score']))
        
        return jsonify({
            'success': True,
            'leaderboard': sorted_leaderboard[:limit],
            'total_players': len(players_with_accuracy)
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/leaderboard/filtered', methods=['GET'])
def get_filtered_leaderboard():
    """Get filtered leaderboard with various options"""
    try:
        limit = request.args.get('limit', 10, type=int)
        sort_by = request.args.get('sort_by', 'score')  # score, accuracy, correct_answers, duration
        min_score = request.args.get('min_score', 0, type=int)
        max_score = request.args.get('max_score', float('inf'), type=int)
        min_accuracy = request.args.get('min_accuracy', 0, type=float)
        max_accuracy = request.args.get('max_accuracy', 100, type=float)
        
        # Start with all players
        filtered_players = leaderboard.copy()
        
        # Apply score filters
        filtered_players = [p for p in filtered_players if min_score <= p['score'] <= max_score]
        
        # Apply accuracy filters
        if min_accuracy > 0 or max_accuracy < 100:
            players_with_accuracy = []
            for player in filtered_players:
                if player['total_questions'] > 0:
                    accuracy = (player['correct_answers'] / player['total_questions']) * 100
                    if min_accuracy <= accuracy <= max_accuracy:
                        player_with_accuracy = player.copy()
                        player_with_accuracy['accuracy'] = round(accuracy, 2)
                        players_with_accuracy.append(player_with_accuracy)
            filtered_players = players_with_accuracy
        
        # Sort based on sort_by parameter
        if sort_by == 'score':
            sorted_players = sorted(filtered_players, key=lambda x: (-x['score'], x['timestamp']))
        elif sort_by == 'accuracy':
            if 'accuracy' not in filtered_players[0] if filtered_players else True:
                # Calculate accuracy if not already present
                for player in filtered_players:
                    if player['total_questions'] > 0:
                        player['accuracy'] = round((player['correct_answers'] / player['total_questions']) * 100, 2)
            sorted_players = sorted(filtered_players, key=lambda x: (-x.get('accuracy', 0), -x['score']))
        elif sort_by == 'correct_answers':
            sorted_players = sorted(filtered_players, key=lambda x: (-x['correct_answers'], -x['score']))
        elif sort_by == 'duration':
            # For duration, we need to get from sessions
            sessions_with_duration = [session for session in game_sessions.values() 
                                    if session.get('status') == 'completed' and 'duration' in session]
            session_map = {session['player_id']: session for session in sessions_with_duration}
            
            players_with_duration = []
            for player in filtered_players:
                if player['player_id'] in session_map:
                    player_with_duration = player.copy()
                    player_with_duration['duration'] = session_map[player['player_id']]['duration']
                    players_with_duration.append(player_with_duration)
            
            sorted_players = sorted(players_with_duration, key=lambda x: x.get('duration', float('inf')))
        else:
            sorted_players = sorted(filtered_players, key=lambda x: (-x['score'], x['timestamp']))
        
        return jsonify({
            'success': True,
            'leaderboard': sorted_players[:limit],
            'total_players': len(filtered_players),
            'filters_applied': {
                'sort_by': sort_by,
                'min_score': min_score,
                'max_score': max_score if max_score != float('inf') else None,
                'min_accuracy': min_accuracy,
                'max_accuracy': max_accuracy
            }
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard():
    """Get the current leaderboard from Firebase"""
    try:
        limit = request.args.get('limit', 10, type=int)
        
        # Get leaderboard from Firebase Firestore
        leaderboard_ref = get_db().collection('tech_quiz_leaderboard')
        docs = leaderboard_ref.order_by('score', direction=firestore.Query.DESCENDING).limit(limit).stream()
        
        leaderboard_data = []
        for doc in docs:
            data = doc.to_dict()
            data['id'] = doc.id
            leaderboard_data.append(data)
        
        return jsonify({
            'success': True,
            'leaderboard': leaderboard_data,
            'total_players': len(leaderboard_data)
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/leaderboard', methods=['POST'])
def submit_score():
    """Submit a player's score to the leaderboard"""
    try:
        data = request.get_json()
        
        required_fields = ['player_name', 'score', 'correct_answers', 'total_questions']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400
        
        # Create player entry
        player_id = data.get('player_id', f"player_{int(time.time())}_{random.randint(1000, 9999)}")
        accuracy = round((int(data['correct_answers']) / int(data['total_questions'])) * 100, 2)
        
        player_entry = {
            'player_name': data['player_name'],
            'score': int(data['score']),
            'correct_answers': int(data['correct_answers']),
            'total_questions': int(data['total_questions']),
            'accuracy': accuracy,
            'level': data.get('level', 'novice'),
            'time_taken': data.get('time_taken', 0),
            'hints_used': data.get('hints_used', 0),
            'timestamp': firestore.SERVER_TIMESTAMP,
            'date': datetime.now().isoformat(),
            'player_id': player_id,
            'photo_url': data.get('photo_url', ''),
            'email': data.get('email', '')
        }
        
        # Save to Firebase Firestore
        doc_ref = get_db().collection('tech_quiz_leaderboard').document(player_id).set(player_entry)
        
        return jsonify({
            'success': True,
            'message': 'Score saved successfully',
            'player_id': player_id,
            'accuracy': accuracy,
            'player_entry': player_entry
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/game-session', methods=['POST'])
def create_game_session():
    """Create a new game session"""
    try:
        data = request.get_json()
        session_id = f"session_{int(time.time())}_{random.randint(1000, 9999)}"
        
        game_session = {
            'session_id': session_id,
            'player_name': data.get('player_name', 'Anonymous'),
            'player_id': data.get('player_id', f"player_{int(time.time())}"),
            'start_time': time.time(),
            'questions': [],
            'current_question': 0,
            'score': 0,
            'hints_used': 0,
            'status': 'active'
        }
        
        game_sessions[session_id] = game_session
        
        return jsonify({
            'success': True,
            'session_id': session_id,
            'game_session': game_session
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/game-session/<session_id>', methods=['GET'])
def get_game_session(session_id):
    """Get game session details"""
    try:
        if session_id not in game_sessions:
            return jsonify({
                'success': False,
                'error': 'Game session not found'
            }), 404
        
        return jsonify({
            'success': True,
            'game_session': game_sessions[session_id]
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/game-session/<session_id>/answer', methods=['POST'])
def submit_session_answer(session_id):
    """Submit an answer for a game session"""
    try:
        if session_id not in game_sessions:
            return jsonify({
                'success': False,
                'error': 'Game session not found'
            }), 404
        
        data = request.get_json()
        question_id = data.get('question_id')
        user_answer = data.get('answer', '').strip().lower()
        time_taken = data.get('time_taken', 0)
        
        # Verify answer
        questions = load_questions()
        question = next((q for q in questions if q['id'] == question_id), None)
        
        if not question:
            return jsonify({
                'success': False,
                'error': 'Question not found'
            }), 404
        
        correct_answer = question['answer'].lower()
        is_correct = user_answer == correct_answer
        
        # Calculate points
        points = 0
        if is_correct:
            base_points = 10
            time_bonus = max(0, int(time_taken))
            points = base_points + time_bonus
        
        # Update game session
        game_sessions[session_id]['score'] += points
        game_sessions[session_id]['current_question'] += 1
        
        # Add to questions answered
        game_sessions[session_id]['questions'].append({
            'question_id': question_id,
            'user_answer': data.get('answer', ''),
            'correct_answer': question['answer'],
            'is_correct': is_correct,
            'points': points,
            'time_taken': time_taken,
            'timestamp': time.time()
        })
        
        return jsonify({
            'success': True,
            'is_correct': is_correct,
            'points': points,
            'total_score': game_sessions[session_id]['score'],
            'correct_answer': question['answer']
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/game-session/<session_id>/end', methods=['POST'])
def end_game_session(session_id):
    """End a game session and submit final score"""
    try:
        if session_id not in game_sessions:
            return jsonify({
                'success': False,
                'error': 'Game session not found'
            }), 404
        
        game_session = game_sessions[session_id]
        game_session['status'] = 'completed'
        game_session['end_time'] = time.time()
        game_session['duration'] = game_session['end_time'] - game_session['start_time']
        
        # Calculate final stats
        correct_answers = sum(1 for q in game_session['questions'] if q['is_correct'])
        total_questions = len(game_session['questions'])
        
        # Submit to leaderboard
        player_entry = {
            'player_name': game_session['player_name'],
            'score': game_session['score'],
            'correct_answers': correct_answers,
            'total_questions': total_questions,
            'timestamp': time.time(),
            'date': datetime.now().isoformat(),
            'player_id': game_session['player_id'],
            'photo_url': '',
            'session_id': session_id
        }
        
        leaderboard.append(player_entry)
        
        # Calculate final rank
        sorted_leaderboard = sorted(leaderboard, key=lambda x: (-x['score'], x['timestamp']))
        rank = next(i + 1 for i, player in enumerate(sorted_leaderboard) if player['player_id'] == player_entry['player_id'])
        
        return jsonify({
            'success': True,
            'final_score': game_session['score'],
            'correct_answers': correct_answers,
            'total_questions': total_questions,
            'rank': rank,
            'duration': game_session['duration'],
            'game_session': game_session
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/player-stats/<player_id>', methods=['GET'])
def get_player_stats(player_id):
    """Get player statistics"""
    try:
        # Get all games by this player
        player_games = [player for player in leaderboard if player['player_id'] == player_id]
        
        if not player_games:
            return jsonify({
                'success': False,
                'error': 'Player not found'
            }), 404
        
        # Calculate statistics
        total_games = len(player_games)
        total_score = sum(game['score'] for game in player_games)
        total_correct = sum(game['correct_answers'] for game in player_games)
        total_questions = sum(game['total_questions'] for game in player_games)
        best_score = max(game['score'] for game in player_games)
        best_accuracy = max((game['correct_answers'] / game['total_questions'] * 100) 
                           for game in player_games if game['total_questions'] > 0)
        
        # Calculate average time per game (if available)
        player_sessions = [session for session in game_sessions.values() 
                          if session.get('player_id') == player_id and session.get('status') == 'completed']
        avg_duration = 0
        if player_sessions:
            total_duration = sum(session.get('duration', 0) for session in player_sessions)
            avg_duration = total_duration / len(player_sessions)
        
        # Calculate current rank
        sorted_leaderboard = sorted(leaderboard, key=lambda x: (-x['score'], x['timestamp']))
        current_rank = next((i + 1 for i, player in enumerate(sorted_leaderboard) 
                           if player['player_id'] == player_id), None)
        
        stats = {
            'player_id': player_id,
            'player_name': player_games[0]['player_name'],
            'total_games': total_games,
            'total_score': total_score,
            'total_correct': total_correct,
            'total_questions': total_questions,
            'best_score': best_score,
            'best_accuracy': round(best_accuracy, 2),
            'average_score': round(total_score / total_games, 2) if total_games > 0 else 0,
            'overall_accuracy': round((total_correct / total_questions * 100), 2) if total_questions > 0 else 0,
            'average_duration': round(avg_duration, 2),
            'current_rank': current_rank,
            'games': player_games
        }
        
        return jsonify({
            'success': True,
            'stats': stats
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/stats', methods=['GET'])
def get_game_stats():
    """Get overall game statistics"""
    try:
        total_players = len(leaderboard)
        total_sessions = len(game_sessions)
        active_sessions = sum(1 for session in game_sessions.values() if session['status'] == 'active')
        
        if total_players > 0:
            avg_score = sum(player['score'] for player in leaderboard) / total_players
            highest_score = max(player['score'] for player in leaderboard)
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
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/health', methods=['GET'])
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
        'success': True,
        'status': 'healthy',
        'timestamp': time.time(),
        'version': '1.0.0',
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
    return jsonify({
        'success': False,
        'error': 'Endpoint not found'
    }), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'error': 'Internal server error'
    }), 500

if __name__ == '__main__':
    # Load questions on startup
    questions = load_questions()
    print(f"Loaded {len(questions)} questions")
    
    # Print all routes for debugging
    print("Available routes:")
    for rule in app.url_map.iter_rules():
        if 'leaderboard' in rule.rule:
            print(f"  {rule.rule} -> {rule.endpoint}")
    
    # Run the Flask app
    app.run(debug=True, host='0.0.0.0', port=5000, use_reloader=False)
