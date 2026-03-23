// ===== FIREBASE CONFIGURATION =====
const firebaseConfig = {
  apiKey: "AIzaSyD7YBXficoM_mMUilkk_Tu2XAFM_Czh6XQ",
  authDomain: "techguess-pro-dssa.firebaseapp.com",
  projectId: "techguess-pro-dssa",
  storageBucket: "techguess-pro-dssa.firebasestorage.app",
  messagingSenderId: "966351355109",
  appId: "1:966351355109:web:39d42f83f5fa551732e80c",
  measurementId: "G-P6XP9W1FXS",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ===== GAME STATE =====
let gameState = {
  currentQuestion: 0,
  score: 0,
  timeLeft: 10,
  hintsUsed: 0,
  maxHints: 3,
  totalQuestions: 10,
  gameStarted: false,
  gameEnded: false,
  timer: null,
  user: null,
  questions: [],
  correctAnswers: 0,
  selectedLevel: null, // 'novice' or 'expert'

  // Clean data tracking
  userAnswers: [], // Store user's answers for each question
  questionTimes: [], // Store time spent on each question
  questionHints: [], // Store hints used per question
  questionStartTime: null, // Track when current question started
};

// Level configurations
const levelConfig = {
  novice: {
    questions: 10,
    pointsPerCorrect: 2,
    timePerQuestion: 30,
    maxHints: 3,
    difficulty: "basic",
  },
  expert: {
    questions: 15,
    pointsPerCorrect: 3,
    timePerQuestion: 25,
    maxHints: 2,
    difficulty: "advanced",
  },
};

// ===== SAMPLE QUESTIONS DATA =====
const sampleQuestions = [
  {
    id: 1,
    question: "What does HTML stand for?",
    answer: "HyperText Markup Language",
    hints: [
      "It's a markup language for web pages",
      "Starts with 'Hyper' and ends with 'Language'",
      "Used to structure content on the web",
    ],
  },
  {
    id: 2,
    question:
      "Which programming language is known as the 'language of the web'?",
    answer: "JavaScript",
    hints: [
      "It runs in web browsers",
      "Not to be confused with Java",
      "Used for interactive web pages",
    ],
  },
  {
    id: 3,
    question: "What does CSS stand for?",
    answer: "Cascading Style Sheets",
    hints: [
      "It styles web pages",
      "Controls the appearance and layout",
      "Works alongside HTML",
    ],
  },
  {
    id: 4,
    question: "Which database is commonly used with web applications?",
    answer: "MySQL",
    hints: [
      "It's a relational database",
      "Open source and widely used",
      "Starts with 'My' and ends with 'SQL'",
    ],
  },
  {
    id: 5,
    question: "What does API stand for?",
    answer: "Application Programming Interface",
    hints: [
      "It allows different software to communicate",
      "A set of protocols and tools",
      "Starts with 'Application' and ends with 'Interface'",
    ],
  },
  {
    id: 6,
    question: "Which framework is used for building user interfaces in React?",
    answer: "React",
    hints: [
      "It's a JavaScript library",
      "Created by Facebook",
      "Uses components and JSX",
    ],
  },
  {
    id: 7,
    question: "What does SQL stand for?",
    answer: "Structured Query Language",
    hints: [
      "Used to manage databases",
      "Allows you to query and manipulate data",
      "Starts with 'Structured' and ends with 'Language'",
    ],
  },
  {
    id: 8,
    question: "Which protocol is used for secure web communication?",
    answer: "HTTPS",
    hints: [
      "It's an extension of HTTP",
      "Provides encryption and security",
      "Starts with 'HTTP' and ends with 'S'",
    ],
  },
  {
    id: 9,
    question: "What does JSON stand for?",
    answer: "JavaScript Object Notation",
    hints: [
      "It's a data format",
      "Lightweight and easy to read",
      "Starts with 'JavaScript' and ends with 'Notation'",
    ],
  },
  {
    id: 10,
    question: "Which version control system is most popular?",
    answer: "Git",
    hints: [
      "Created by Linus Torvalds",
      "Distributed version control",
      "Three letters, starts with 'G'",
    ],
  },
];

// ===== DOM ELEMENTS =====
const elements = {
  authSection: document.getElementById("auth-section"),
  gameSection: document.getElementById("game-section"),
  levelSection: document.getElementById("level-section"),
  googleSigninBtn: document.getElementById("google-signin-btn"),
  playerAvatar: document.getElementById("player-avatar"),
  playerName: document.getElementById("player-name"),
  playerScore: document.getElementById("player-score"),
  playerStatus: document.getElementById("player-status"),
  questionNumber: document.getElementById("question-number"),
  countdown: document.getElementById("countdown"),
  questionContent: document.getElementById("question-content"),
  answerBox: document.getElementById("answer-box"),
  hintBtn: document.getElementById("hint-btn"),
  hintCount: document.getElementById("hint-count"),
  submitBtn: document.getElementById("submit-btn"),
  feedback: document.getElementById("feedback"),
  progressFill: document.getElementById("progress-fill"),
  progressText: document.getElementById("progress-text"),
  leaderboardList: document.getElementById("leaderboard-list"),
  gameOverModal: document.getElementById("game-over-modal"),
  finalScore: document.getElementById("final-score"),
  correctAnswers: document.getElementById("correct-answers"),
  finalRank: document.getElementById("final-rank"),
  playAgainBtn: document.getElementById("play-again-btn"),
  viewLeaderboardBtn: document.getElementById("view-leaderboard-btn"),
  signOutBtn: document.getElementById("sign-out-btn"),
  viewLeaderboardGuestBtn: document.getElementById(
    "view-leaderboard-guest-btn"
  ),
};

// ===== AUTHENTICATION =====
function initAuth() {
  // Check if user is already signed in
  auth.onAuthStateChanged((user) => {
    if (user) {
      gameState.user = user;
      showGame();
    } else {
      showAuth();
    }
  });
}

function signInWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth
    .signInWithPopup(provider)
    .then((result) => {
      gameState.user = result.user;
      showGame();
    })
    .catch((error) => {
      console.error("Sign-in error:", error);
      if (error.code === "auth/popup-blocked") {
        showFeedback("Popup blocked. Trying redirect method...", "hint");
        // Fallback to redirect
        auth.signInWithRedirect(provider);
      } else {
        showFeedback("Authentication failed. Please try again.", "incorrect");
      }
    });
}

// REMOVED DUPLICATE FUNCTION - using the one below

function viewLeaderboardAsGuest() {
  console.log("Viewing leaderboard as guest...");

  // Hide auth section and show leaderboard
  elements.authSection.style.display = "none";
  elements.gameSection.style.display = "block";

  // Hide game area and show only leaderboard
  const gameArea = document.getElementById("game-area");
  if (gameArea) {
    gameArea.style.display = "none";
  }

  // Ensure leaderboard is visible
  const leaderboard = document.getElementById("leaderboard");
  if (leaderboard) {
    // Force visibility with multiple methods
    leaderboard.style.display = "block";
    leaderboard.style.visibility = "visible";
    leaderboard.style.opacity = "1";
    leaderboard.style.height = "auto";
    leaderboard.style.minHeight = "200px";
    leaderboard.classList.remove("hidden");
    leaderboard.classList.add("visible");

    console.log("Leaderboard element found and made visible");
    console.log(
      "Leaderboard computed style:",
      window.getComputedStyle(leaderboard).display
    );
    console.log("Leaderboard offsetHeight:", leaderboard.offsetHeight);
    console.log("Leaderboard clientHeight:", leaderboard.clientHeight);
  } else {
    console.error("Leaderboard element not found!");
  }

  // Show guest message
  const guestMessage = `
    <div class="guest-message">
      <div class="guest-icon">👋</div>
      <h3 class="guest-title">Welcome, Guest!</h3>
      <p class="guest-text">You're viewing the leaderboard as a guest. Sign in to play the quiz!</p>
      <button id="back-to-auth-btn" class="back-to-auth-btn">
        <i class="fas fa-arrow-left"></i>
        Back to Sign In
      </button>
    </div>
  `;

  const gameHeader = document.querySelector(".game-header");
  gameHeader.insertAdjacentHTML("afterend", guestMessage);

  // Add event listener for back button
  const backBtn = document.getElementById("back-to-auth-btn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      elements.gameSection.style.display = "none";
      elements.authSection.style.display = "flex";
      // Remove guest message
      const guestMsg = document.querySelector(".guest-message");
      if (guestMsg) {
        guestMsg.remove();
      }
    });
  }

  // Load leaderboard data
  console.log("Calling updateLeaderboard for guest...");
  updateLeaderboard();

  // Force scroll to leaderboard
  setTimeout(() => {
    if (leaderboard) {
      leaderboard.scrollIntoView({ behavior: "smooth", block: "center" });
      console.log("Scrolled to leaderboard");

      // Check if leaderboard is actually visible
      const rect = leaderboard.getBoundingClientRect();
      const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
      console.log("Leaderboard visibility check:", isVisible);
      console.log("Leaderboard rect:", rect);

      if (!isVisible) {
        console.warn("Leaderboard not visible, forcing display...");
        leaderboard.style.position = "relative";
        leaderboard.style.zIndex = "1000";
        leaderboard.style.backgroundColor = "rgba(22, 24, 40, 0.95)";
      }
    }
  }, 1000);
}

function signOut() {
  auth.signOut().then(() => {
    gameState.user = null;
    // gameState.hasAttempted = false; // Commented out for multiple attempts

    // Clean up any existing restriction messages
    const existingRestriction = document.querySelector(".attempt-restriction");
    if (existingRestriction) {
      existingRestriction.remove();
    }

    // Reset game state without showing level selection
    gameState.currentQuestion = 0;
    gameState.score = 0;
    gameState.correctAnswers = 0;
    gameState.hintsUsed = 0;
    gameState.gameStarted = false;
    gameState.gameEnded = false;
    gameState.selectedLevel = null;

    // Clear timer
    if (gameState.timer) {
      clearInterval(gameState.timer);
      gameState.timer = null;
    }

    // Reset UI elements
    elements.gameOverModal.style.display = "none";
    elements.answerBox.value = "";
    elements.feedback.style.display = "none";

    // Reset progress
    elements.progressFill.style.width = "0%";
    elements.progressText.textContent = "0/10";

    // Go directly to login page
    showAuth();
  });
}

function showAuth() {
  elements.authSection.style.display = "flex";
  elements.gameSection.style.display = "none";
}

function showGame() {
  elements.authSection.style.display = "none";
  elements.gameSection.style.display = "none";
  elements.levelSection.style.display = "flex";

  if (gameState.user) {
    elements.playerAvatar.src =
      gameState.user.photoURL || "https://via.placeholder.com/40";
    elements.playerName.textContent = gameState.user.displayName || "Player";
  }
}

function showLevelSelection() {
  elements.authSection.style.display = "none";
  elements.gameSection.style.display = "none";
  elements.levelSection.style.display = "flex";
}

function selectLevel(level) {
  console.log("selectLevel called with level:", level);
  gameState.selectedLevel = level;

  // No loading state - instant transition

  // Update UI to show selected level
  document.querySelectorAll(".level-option").forEach((option) => {
    option.classList.remove("selected");
  });
  document.querySelector(`[data-level="${level}"]`).classList.add("selected");

  // Update level badge
  const levelBadge = document.getElementById("level-badge");
  if (levelBadge) {
    const config = levelConfig[level];
    levelBadge.textContent = level === "novice" ? "🌱 Novice" : "🚀 Expert";
    levelBadge.style.background =
      level === "novice"
        ? "linear-gradient(135deg, #10b981, #059669)"
        : "linear-gradient(135deg, #3b82f6, #2563eb)";
  }

  // Start the game with selected level
  console.log("Calling initGame...");
  initGame();
}

function showGameSection() {
  console.log("showGameSection called");
  console.log("elements.authSection:", elements.authSection);
  console.log("elements.levelSection:", elements.levelSection);
  console.log("elements.gameSection:", elements.gameSection);

  elements.authSection.style.display = "none";
  elements.levelSection.style.display = "none";
  elements.gameSection.style.display = "block";

  console.log("Game section should now be visible");
}

// ===== ATTEMPT RESTRICTION =====
// function checkUserAttempt() {
//   if (!gameState.user) return;

//   // SINGLE ATTEMPT RESTRICTION ENABLED
//   // Check localStorage for previous attempt
//   const attemptKey = `attempt_${gameState.user.uid}`;
//   const previousAttempt = localStorage.getItem(attemptKey);

//   if (previousAttempt) {
//     const attemptData = JSON.parse(previousAttempt);
//     gameState.hasAttempted = true;
//     gameState.attemptId = attemptData.attemptId;

//     console.log(
//       "🚫 SINGLE ATTEMPT RESTRICTION: User has already attempted the quiz"
//     );
//     console.log("Previous attempt data:", attemptData);

//     // Show restriction message
//     showAttemptRestriction(attemptData);
//     return;
//   }

//   // User can attempt for the first time
//   initGame();
// }

// function showAttemptRestriction(attemptData) {
//   // Check if restriction message already exists
//   const existingRestriction = document.querySelector(".attempt-restriction");
//   if (existingRestriction) {
//     console.log("Restriction message already exists, skipping...");
//     return;
//   }

//   // Hide only the game area (questions, answers, etc.) but keep leaderboard visible
//   const gameArea = document.getElementById("game-area");
//   if (gameArea) {
//     gameArea.style.display = "none";
//   }

//   // Ensure leaderboard is visible
//   const leaderboard = document.getElementById("leaderboard");
//   if (leaderboard) {
//     leaderboard.style.display = "block";
//   }

//   // Update player status to show already attempted
//   elements.playerStatus.className = "status-indicator attempted";
//   elements.playerStatus.innerHTML =
//     '<span class="status-icon">🚫</span><span class="status-text">Already Attempted</span>';

//   const restrictionHTML = `
//     <div class="attempt-restriction">
//       <div class="restriction-icon">🚫</div>
//       <h3 class="restriction-title">Already Attempted</h3>
//       <p class="restriction-message">
//         You have already completed the quiz on ${new Date(
//           attemptData.timestamp
//         ).toLocaleDateString()}.
//       </p>
//       <div class="previous-score">
//         <div class="score-item">
//           <span class="score-label">Your Score:</span>
//           <span class="score-value">${attemptData.score}</span>
//         </div>
//         <div class="score-item">
//           <span class="score-label">Correct Answers:</span>
//           <span class="score-value">${attemptData.correctAnswers}/${
//     attemptData.totalQuestions
//   }</span>
//         </div>
//       </div>
//       <div class="restriction-actions">
//         <button id="view-leaderboard-only-btn" class="view-leaderboard-only-btn">
//           <i class="fas fa-trophy"></i>
//           View Leaderboard
//         </button>
//         <button id="sync-score-btn" class="sync-score-btn">
//           <i class="fas fa-sync"></i>
//           Sync My Score
//         </button>
//       </div>
//     </div>
//   `;

//   // Insert restriction message after game header
//   const gameHeader = document.querySelector(".game-header");
//   gameHeader.insertAdjacentHTML("afterend", restrictionHTML);

//   // Add event listener for leaderboard button (only if not already added)
//   const leaderboardBtn = document.getElementById("view-leaderboard-only-btn");
//   if (leaderboardBtn && !leaderboardBtn.hasAttribute("data-listener-added")) {
//     leaderboardBtn.addEventListener("click", () => {
//       const leaderboard = document.getElementById("leaderboard");
//       if (leaderboard) {
//         leaderboard.scrollIntoView({ behavior: "smooth", block: "center" });
//       }
//     });
//     leaderboardBtn.setAttribute("data-listener-added", "true");
//   }

//   // Add event listener for sync score button (only if not already added)
//   const syncBtn = document.getElementById("sync-score-btn");
//   if (syncBtn && !syncBtn.hasAttribute("data-listener-added")) {
//     syncBtn.addEventListener("click", () => {
//       syncPreviousScoreToLeaderboard(attemptData);
//     });
//     syncBtn.setAttribute("data-listener-added", "true");
//   }

//   // Load leaderboard data for restricted users
//   updateLeaderboard();
// }

function syncPreviousScoreToLeaderboard(attemptData) {
  if (!gameState.user) {
    showFeedback("Please sign in to sync your score", "incorrect");
    return;
  }

  console.log("Syncing previous score to leaderboard:", attemptData);

  const playerData = {
    displayName: gameState.user.displayName,
    photoURL: gameState.user.photoURL,
    score: attemptData.score,
    points: attemptData.score, // Add points for leaderboard sorting
    correctAnswers: attemptData.correctAnswers,
    totalQuestions: attemptData.totalQuestions,
    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    userId: gameState.user.uid,
    email: gameState.user.email,
    syncedFrom: "localStorage",
  };

  db.collection("leaderboard")
    .doc(gameState.user.uid)
    .set(playerData)
    .then(() => {
      console.log("Previous score synced successfully to Firebase");
      showFeedback("Score synced to leaderboard!", "correct");

      // Update the sync button to show success
      const syncBtn = document.getElementById("sync-score-btn");
      if (syncBtn) {
        syncBtn.innerHTML = '<i class="fas fa-check"></i> Synced!';
        syncBtn.disabled = true;
        syncBtn.style.background = "linear-gradient(135deg, #10b981, #059669)";
      }
    })
    .catch((error) => {
      console.error("Error syncing score to Firebase:", error);
      showFeedback("Error syncing score to leaderboard", "incorrect");
    });
}

// ===== GAME LOGIC =====
function initGame() {
  console.log("initGame called with selectedLevel:", gameState.selectedLevel);

  if (!gameState.selectedLevel) {
    console.error("No level selected");
    return;
  }

  const config = levelConfig[gameState.selectedLevel];
  console.log("Level config:", config);

  // Update game state with level configuration
  gameState.totalQuestions = config.questions;
  gameState.maxHints = config.maxHints;
  gameState.hintsUsed = 0;
  gameState.timeLeft = config.timePerQuestion;

  // Use sample questions immediately for faster loading
  console.log("Using sample questions for faster loading...");
  const allQuestions = sampleQuestions;
  gameState.questions = filterQuestionsByLevel(allQuestions, config.difficulty);

  // Shuffle and limit questions based on level
  gameState.questions = [...gameState.questions]
    .sort(() => Math.random() - 0.5)
    .slice(0, config.questions);

  gameState.totalQuestions = gameState.questions.length;
  console.log("Questions loaded, showing game section...");
  showGameSection();
  startGame();

  // Try to load from API in background for future use (optional)
  fetch("/api/questions")
    .then((response) => response.json())
    .then((data) => {
      console.log("API questions loaded in background");
      // Store for potential future use
      window.apiQuestions = data.questions;
    })
    .catch((error) => {
      console.log("API not available, using sample questions");
    });

  // Reset game state
  gameState.currentQuestion = 0;
  gameState.score = 0;
  gameState.correctAnswers = 0;
  gameState.gameStarted = false;
  gameState.gameEnded = false;

  // Reset clean data tracking
  gameState.userAnswers = [];
  gameState.questionTimes = [];
  gameState.questionHints = [];
  gameState.questionStartTime = null;

  updateUI();
}

function filterQuestionsByLevel(questions, difficulty) {
  // For now, return all questions. In a real implementation,
  // questions would have a difficulty field
  return questions;
}

function startGame() {
  console.log("startGame called");
  gameState.gameStarted = true;
  updateUI(); // Update UI to show "Playing" status
  console.log("About to show first question...");
  showQuestion();
  startTimer();
  updateLeaderboard();
  console.log("Game started successfully");
}

function showQuestion() {
  console.log("showQuestion called");
  console.log("Current question index:", gameState.currentQuestion);
  console.log("Total questions:", gameState.totalQuestions);
  console.log("Questions array length:", gameState.questions.length);

  const question = gameState.questions[gameState.currentQuestion];
  console.log("Current question:", question);

  // Track question start time
  gameState.questionStartTime = Date.now();

  elements.questionNumber.textContent = `Question ${
    gameState.currentQuestion + 1
  } of ${gameState.totalQuestions}`;
  elements.questionContent.textContent = question.question;
  elements.answerBox.value = "";
  elements.answerBox.focus();

  console.log("Question displayed successfully");

  // Reset feedback
  elements.feedback.style.display = "none";
  elements.feedback.className = "feedback-area";

  // Update progress
  const progress = (gameState.currentQuestion / gameState.totalQuestions) * 100;
  elements.progressFill.style.width = `${progress}%`;
  elements.progressText.textContent = `${gameState.currentQuestion}/${gameState.totalQuestions}`;

  // Reset timer
  // Set timer based on level
  const config = levelConfig[gameState.selectedLevel];
  gameState.timeLeft = config.timePerQuestion;
  updateTimerDisplay();

  // Update hint button
  const hintsLeft = gameState.maxHints - gameState.hintsUsed;
  elements.hintCount.textContent = hintsLeft;
  elements.hintBtn.disabled = hintsLeft <= 0;
}

function startTimer() {
  if (gameState.timer) {
    clearInterval(gameState.timer);
  }

  gameState.timer = setInterval(() => {
    gameState.timeLeft--;
    updateTimerDisplay();

    if (gameState.timeLeft <= 0) {
      timeUp();
    }
  }, 1000);
}

function updateTimerDisplay() {
  elements.countdown.textContent = gameState.timeLeft;

  // Update timer styling based on time left
  elements.countdown.className = "timer-display";
  if (gameState.timeLeft <= 5) {
    elements.countdown.classList.add("critical");
  } else if (gameState.timeLeft <= 10) {
    elements.countdown.classList.add("warning");
  }
}

function timeUp() {
  clearInterval(gameState.timer);
  showFeedback(
    "Time's up! The correct answer was: " +
      gameState.questions[gameState.currentQuestion].answer,
    "incorrect"
  );
  nextQuestion();
}

function submitAnswer() {
  if (!gameState.gameStarted || gameState.gameEnded) return;

  const userAnswer = elements.answerBox.value.trim();

  // Input validation
  if (!userAnswer || userAnswer.length === 0) {
    showFeedback("Please enter an answer!", "incorrect");
    return;
  }

  if (userAnswer.length > 100) {
    showFeedback("Answer too long! Maximum 100 characters.", "incorrect");
    return;
  }

  const correctAnswer = gameState.questions[gameState.currentQuestion].answer;

  // Track user answer and time spent
  const timeSpent = gameState.questionStartTime
    ? Math.round((Date.now() - gameState.questionStartTime) / 1000)
    : 10;

  gameState.userAnswers[gameState.currentQuestion] = userAnswer;
  gameState.questionTimes[gameState.currentQuestion] = timeSpent;
  gameState.questionHints[gameState.currentQuestion] = gameState.hintsUsed;

  clearInterval(gameState.timer);

  if (userAnswer.toLowerCase() === correctAnswer.toLowerCase()) {
    const config = levelConfig[gameState.selectedLevel];
    const timeBonus = Math.max(0, gameState.timeLeft);
    const basePoints = config.pointsPerCorrect;
    const points = basePoints + timeBonus;
    gameState.score += points;
    gameState.correctAnswers++;

    showFeedback(
      `✅ Correct! +${points} points (${basePoints} base + ${timeBonus} time bonus)`,
      "correct"
    );
    updateScore();
    updateUI(); // Update UI to reflect new score
    showJustScored();
  } else {
    showFeedback(
      `❌ Incorrect! The correct answer was: ${correctAnswer}`,
      "incorrect"
    );
    updateUI(); // Update UI even for incorrect answers
  }

  nextQuestion();
}

function showHint() {
  if (gameState.hintsUsed >= gameState.maxHints) return;

  const question = gameState.questions[gameState.currentQuestion];
  const hintIndex = gameState.hintsUsed;

  if (hintIndex < question.hints.length) {
    showFeedback(`💡 Hint: ${question.hints[hintIndex]}`, "hint");
    gameState.hintsUsed++;

    const hintsLeft = gameState.maxHints - gameState.hintsUsed;
    elements.hintCount.textContent = hintsLeft;
    elements.hintBtn.disabled = hintsLeft <= 0;
  }
}

function nextQuestion() {
  gameState.currentQuestion++;

  if (gameState.currentQuestion >= gameState.totalQuestions) {
    endGame();
  } else {
    setTimeout(() => {
      updateUI(); // Update UI before showing next question
      showQuestion();
      startTimer();
    }, 2000);
  }
}

function endGame() {
  gameState.gameEnded = true;
  clearInterval(gameState.timer);

  // Update UI to show finished status
  updateUI();

  // Update final stats
  elements.finalScore.textContent = gameState.score;
  elements.correctAnswers.textContent = `${gameState.correctAnswers}/${gameState.totalQuestions}`;

  // Calculate rank (simplified)
  const rank = calculateRank();
  elements.finalRank.textContent = `#${rank}`;

  // Save attempt data to localStorage for single attempt restriction
  // saveAttemptData(); // Commented out to allow multiple attempts

  // Save score to leaderboard
  saveScore();

  // Show game over modal
  setTimeout(() => {
    elements.gameOverModal.style.display = "flex";
  }, 2000);
}

function calculateRank() {
  // This is a simplified rank calculation
  // In a real app, you'd compare with other players' scores
  if (gameState.score >= 90) return 1;
  if (gameState.score >= 70) return 2;
  if (gameState.score >= 50) return 3;
  return 4;
}

function resetGame() {
  gameState.currentQuestion = 0;
  gameState.score = 0;
  gameState.correctAnswers = 0;
  gameState.hintsUsed = 0;
  gameState.gameStarted = false;
  gameState.gameEnded = false;
  gameState.selectedLevel = null;

  // Clear timer
  if (gameState.timer) {
    clearInterval(gameState.timer);
    gameState.timer = null;
  }

  // Reset UI elements
  elements.gameOverModal.style.display = "none";
  elements.answerBox.value = "";
  elements.feedback.style.display = "none";

  // Reset progress
  elements.progressFill.style.width = "0%";
  elements.progressText.textContent = "0/10";

  // Show level selection again
  showLevelSelection();

  // Update UI to show reset state
  updateUI();
}

function playAgain() {
  resetGame();
  // initGame() will be called when user selects a level
}

function viewLeaderboard() {
  // Close the game over modal
  elements.gameOverModal.style.display = "none";

  // Scroll to leaderboard
  const leaderboard = document.getElementById("leaderboard");
  if (leaderboard) {
    leaderboard.scrollIntoView({ behavior: "smooth", block: "center" });

    // Add highlight effect
    leaderboard.style.border = "2px solid #3b82f6";
    leaderboard.style.boxShadow = "0 0 20px rgba(59, 130, 246, 0.5)";

    // Remove highlight after 3 seconds
    setTimeout(() => {
      leaderboard.style.border = "1px solid rgba(59, 130, 246, 0.2)";
      leaderboard.style.boxShadow = "0 8px 32px rgba(0, 0, 0, 0.3)";
    }, 3000);
  }
}

// ===== UI UPDATES =====
function updateUI() {
  // Update score display
  elements.playerScore.textContent = `Score: ${gameState.score}`;

  // Update status indicator
  elements.playerStatus.className = "status-indicator";
  if (gameState.gameEnded) {
    elements.playerStatus.classList.add("finished");
    elements.playerStatus.innerHTML =
      '<span class="status-icon">✅</span><span class="status-text">Finished</span>';
  } else if (gameState.gameStarted) {
    elements.playerStatus.classList.add("playing");
    elements.playerStatus.innerHTML =
      '<span class="status-icon">🔴</span><span class="status-text">Playing</span>';
  } else {
    // Initial state - not started yet
    elements.playerStatus.classList.add("ready");
    elements.playerStatus.innerHTML =
      '<span class="status-icon">⏸️</span><span class="status-text">Ready</span>';
  }
}

function updateScore() {
  elements.playerScore.textContent = `Score: ${gameState.score}`;

  // Add visual feedback for score update
  elements.playerScore.classList.add("score-updated");
  setTimeout(() => {
    elements.playerScore.classList.remove("score-updated");
  }, 500);
}

function showJustScored() {
  elements.playerStatus.className = "status-indicator just-scored";
  elements.playerStatus.innerHTML =
    '<span class="status-icon">⚡</span><span class="status-text">Just Scored!</span>';

  setTimeout(() => {
    updateUI();
  }, 2000);
}

function showFeedback(message, type) {
  // Sanitize message to prevent XSS
  const sanitizedMessage = message.replace(/[<>]/g, "");
  elements.feedback.innerHTML = `<div class="feedback-content">${sanitizedMessage}</div>`;
  elements.feedback.className = `feedback-area ${type}`;
  elements.feedback.style.display = "block";

  // Add animation classes
  if (type === "correct") {
    elements.feedback.classList.add("animate-fadeInGreen");
  } else if (type === "incorrect") {
    elements.feedback.classList.add("animate-shakeRed");
  } else if (type === "hint") {
    elements.feedback.classList.add("animate-slideIn");
  }
}

// ===== LEADERBOARD =====
function formatFirebaseDate(timestamp) {
  if (!timestamp) return "Unknown date";

  // Handle Firebase timestamp objects
  if (timestamp.toDate && typeof timestamp.toDate === "function") {
    return timestamp.toDate().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // Handle regular Date objects or timestamps
  if (timestamp instanceof Date) {
    return timestamp.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // Handle numeric timestamps
  if (typeof timestamp === "number") {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return "Unknown date";
}

function updateLeaderboard() {
  // Always load leaderboard data, even for guests
  console.log("Loading leaderboard data...");
  console.log("Firebase db object:", db);
  console.log("Firebase collection path:", db.collection("leaderboard"));

  // Listen for leaderboard updates from Firebase
  db.collection("leaderboard")
    .orderBy("points", "desc")
    .limit(10)
    .onSnapshot(
      (snapshot) => {
        console.log("Firebase snapshot received:", snapshot);
        console.log("Snapshot size:", snapshot.size);
        console.log("Snapshot empty:", snapshot.empty);

        const leaderboard = [];
        snapshot.forEach((doc) => {
          console.log("Processing doc:", doc.id, doc.data());
          const data = doc.data();

          // Validate and sanitize player data
          if (
            data.displayName &&
            typeof data.displayName === "string" &&
            data.displayName.length > 0 &&
            data.displayName.length <= 50 &&
            (data.points !== undefined || data.score !== undefined) &&
            typeof (data.points || data.score) === "number" &&
            (data.points || data.score) >= 0
          ) {
            // Sanitize display name
            const sanitizedName = data.displayName
              .replace(/[<>]/g, "")
              .substring(0, 50);
            leaderboard.push({
              id: doc.id,
              ...data,
              displayName: sanitizedName,
            });
          }
        });
        console.log("Leaderboard data loaded:", leaderboard);
        renderLeaderboard(leaderboard);
      },
      (error) => {
        console.error("Error loading leaderboard:", error);
        console.error("Error code:", error.code);
        console.error("Error message:", error.message);

        // If there's an error, try to load without ordering
        console.log("Trying to load leaderboard without ordering...");
        db.collection("leaderboard")
          .limit(10)
          .get()
          .then((snapshot) => {
            const leaderboard = [];
            snapshot.forEach((doc) => {
              const data = doc.data();
              if (
                data.displayName &&
                (data.points !== undefined || data.score !== undefined)
              ) {
                leaderboard.push({ id: doc.id, ...data });
              }
            });
            // Sort manually by points
            leaderboard.sort(
              (a, b) => (b.points || b.score || 0) - (a.points || a.score || 0)
            );
            console.log("Fallback leaderboard data loaded:", leaderboard);
            renderLeaderboard(leaderboard);
          })
          .catch((fallbackError) => {
            console.error("Fallback also failed:", fallbackError);
            renderLeaderboard([]);
          });
      }
    );
}

function renderLeaderboard(players) {
  console.log("Rendering leaderboard with players:", players);
  console.log("Leaderboard list element:", elements.leaderboardList);

  if (!elements.leaderboardList) {
    console.error("Leaderboard list element not found!");
    return;
  }

  elements.leaderboardList.innerHTML = "";

  // Show empty state if no players
  if (!players || players.length === 0) {
    console.log("No players found, showing empty state");
    const emptyState = document.createElement("div");
    emptyState.className = "leaderboard-empty";
    emptyState.innerHTML = `
      <div class="empty-icon">🏆</div>
      <div class="empty-text">No players yet</div>
      <div class="empty-subtext">Be the first to play!</div>
    `;
    elements.leaderboardList.appendChild(emptyState);
    return;
  }

  // Show real players from Firebase
  players.forEach((player, index) => {
    const rank = index + 1;
    const playerEntry = document.createElement("div");
    playerEntry.className = `player-entry rank-${rank <= 3 ? rank : "default"}`;

    // Add flash animation if this is the current user and they just scored
    if (player.id === gameState.user?.uid && gameState.gameStarted) {
      playerEntry.classList.add("flash");
    }

    playerEntry.innerHTML = `
            <div class="player-info-entry">
                <img src="${
                  player.photoURL || "https://via.placeholder.com/32"
                }" 
                     alt="${player.displayName}" class="player-avatar-entry">
                <div class="player-details">
                    <span class="player-name-entry">${player.displayName}</span>
                    <span class="player-date-entry">${formatFirebaseDate(
                      player.playedAt || player.timestamp
                    )}</span>
                </div>
            </div>
            <div class="player-score-entry">${
              player.points || player.score
            }</div>
            <div class="player-rank rank-${
              rank <= 3 ? rank : "default"
            }">#${rank}</div>
        `;

    elements.leaderboardList.appendChild(playerEntry);
  });
}

// function saveAttemptData() {
//   if (!gameState.user) return;

//   const attemptData = {
//     attemptId: `attempt_${Date.now()}_${gameState.user.uid}`,
//     userId: gameState.user.uid,
//     displayName: gameState.user.displayName,
//     score: gameState.score,
//     correctAnswers: gameState.correctAnswers,
//     totalQuestions: gameState.totalQuestions,
//     timestamp: Date.now(),
//     date: new Date().toISOString(),
//   };

//   // Save to localStorage
//   const attemptKey = `attempt_${gameState.user.uid}`;
//   localStorage.setItem(attemptKey, JSON.stringify(attemptData));

//   console.log("Attempt data saved to localStorage");
// }

function saveScore() {
  if (!gameState.user) return;

  // Clean data structure
  const playerData = {
    // User identification
    userId: gameState.user.uid,
    displayName: gameState.user.displayName || "Anonymous Player",
    email: gameState.user.email || "",
    photoURL: gameState.user.photoURL || "https://via.placeholder.com/32",

    // Game results
    score: gameState.score,
    points: gameState.score, // Store points separately for leaderboard sorting
    correctAnswers: gameState.correctAnswers,
    totalQuestions: gameState.totalQuestions,
    accuracy: Math.round(
      (gameState.correctAnswers / gameState.totalQuestions) * 100
    ),

    // Timestamps
    playedAt: firebase.firestore.FieldValue.serverTimestamp(),
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),

    // Game metadata
    gameVersion: "1.0.0",
    difficulty: "medium",
    hintsUsed: gameState.hintsUsed,
    maxHints: gameState.maxHints,

    // Performance metrics
    averageTimePerQuestion: Math.round(
      (gameState.totalQuestions * 10 - gameState.timeLeft) /
        gameState.totalQuestions
    ),
    completionTime: gameState.totalQuestions * 10 - gameState.timeLeft,
  };

  console.log("Saving clean score data to Firebase:", playerData);

  // Save to leaderboard collection with proper error handling
  db.collection("leaderboard")
    .doc(gameState.user.uid)
    .set(playerData, { merge: true })
    .then(() => {
      console.log("Score saved successfully to Firebase");
      showFeedback("Score saved to leaderboard!", "correct");
    })
    .catch((error) => {
      console.error("Error saving score to Firebase:", error);

      // Handle specific Firebase errors
      if (error.code === "permission-denied") {
        showFeedback("Permission denied. Please sign in again.", "incorrect");
      } else if (error.code === "unavailable") {
        showFeedback(
          "Service temporarily unavailable. Please try again.",
          "incorrect"
        );
      } else {
        showFeedback("Error saving score to leaderboard", "incorrect");
      }
    });

  // Also save to game sessions for detailed tracking
  saveGameSession(playerData);
}

function saveGameSession(playerData) {
  // Create a detailed game session record
  const sessionData = {
    ...playerData,
    sessionId: `session_${Date.now()}_${gameState.user.uid}`,
    questions: gameState.questions.map((q, index) => ({
      questionId: q.id,
      question: q.question,
      correctAnswer: q.answer,
      userAnswer: gameState.userAnswers ? gameState.userAnswers[index] : null,
      isCorrect: gameState.userAnswers
        ? gameState.userAnswers[index]?.toLowerCase().trim() ===
          q.answer.toLowerCase().trim()
        : false,
      timeSpent:
        10 - (gameState.questionTimes ? gameState.questionTimes[index] : 10),
      hintsUsed: gameState.questionHints
        ? gameState.questionHints[index] || 0
        : 0,
    })),
    gameSettings: {
      totalQuestions: gameState.totalQuestions,
      timePerQuestion: 10,
      maxHints: gameState.maxHints,
      difficulty: "medium",
    },
  };

  // Save to game_sessions collection
  db.collection("game_sessions")
    .add(sessionData)
    .then((docRef) => {
      console.log("Game session saved with ID:", docRef.id);
    })
    .catch((error) => {
      console.error("Error saving game session:", error);
    });
}

// ===== EVENT LISTENERS =====
function initEventListeners() {
  console.log("Setting up event listeners...");
  console.log("Google signin button element:", elements.googleSigninBtn);

  // Authentication
  if (elements.googleSigninBtn) {
    elements.googleSigninBtn.addEventListener("click", (e) => {
      console.log("Button clicked!");
      signInWithGoogle();
    });
    console.log("Google signin button event listener added");
  } else {
    console.error("Google signin button not found!");
  }

  // Sign out button
  if (elements.signOutBtn) {
    elements.signOutBtn.addEventListener("click", signOut);
  }

  // Guest leaderboard button
  if (elements.viewLeaderboardGuestBtn) {
    elements.viewLeaderboardGuestBtn.addEventListener(
      "click",
      viewLeaderboardAsGuest
    );
  }

  // Game controls
  elements.submitBtn.addEventListener("click", submitAnswer);
  elements.hintBtn.addEventListener("click", showHint);
  elements.answerBox.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      submitAnswer();
    }
  });

  // Game over modal
  elements.playAgainBtn.addEventListener("click", playAgain);
  elements.viewLeaderboardBtn.addEventListener("click", viewLeaderboard);

  // Close modal when clicking outside
  elements.gameOverModal.addEventListener("click", (e) => {
    if (e.target === elements.gameOverModal) {
      elements.gameOverModal.style.display = "none";
    }
  });

  // Level selection event listeners
  const levelOptions = document.querySelectorAll(".level-option");
  levelOptions.forEach((option) => {
    option.addEventListener("click", () => {
      const level = option.getAttribute("data-level");
      selectLevel(level);
    });
  });

  // Navigation hamburger menu
  const hamburger = document.querySelector(".hamburger");
  const navDropdown = document.querySelector(".nav-dropdown");

  if (hamburger && navDropdown) {
    hamburger.addEventListener("click", (e) => {
      e.preventDefault();
      navDropdown.classList.toggle("open");

      // Toggle hamburger icon
      const icon = hamburger.querySelector("i");
      if (icon) {
        if (navDropdown.classList.contains("open")) {
          icon.classList.remove("fa-bars");
          icon.classList.add("fa-times");
        } else {
          icon.classList.add("fa-bars");
          icon.classList.remove("fa-times");
        }
      }
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", (e) => {
      if (!hamburger.contains(e.target) && !navDropdown.contains(e.target)) {
        navDropdown.classList.remove("open");
        const icon = hamburger.querySelector("i");
        if (icon) {
          icon.classList.add("fa-bars");
          icon.classList.remove("fa-times");
        }
      }
    });

    // Close dropdown when clicking on a link
    navDropdown.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        navDropdown.classList.remove("open");
        const icon = hamburger.querySelector("i");
        if (icon) {
          icon.classList.add("fa-bars");
          icon.classList.remove("fa-times");
        }
      });
    });
  }
}

// ===== UTILITY FUNCTIONS =====
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// ===== PERFORMANCE OPTIMIZATIONS =====
function optimizePerformance() {
  // Throttle scroll events
  let scrollTicking = false;
  const handleScroll = () => {
    if (!scrollTicking) {
      requestAnimationFrame(() => {
        // Handle scroll-based animations here
        scrollTicking = false;
      });
      scrollTicking = true;
    }
  };

  window.addEventListener("scroll", handleScroll, { passive: true });

  // Preload images
  const imageUrls = [
    "https://via.placeholder.com/40",
    "https://via.placeholder.com/32",
  ];

  imageUrls.forEach((url) => {
    const img = new Image();
    img.src = url;
  });
}

// ===== ERROR HANDLING =====
function handleError(error, context) {
  console.error(`Error in ${context}:`, error);

  // Show user-friendly error message
  showFeedback("An error occurred. Please try again.", "incorrect");

  // In production, you might want to send errors to a logging service
  // logError(error, context);
}

// ===== ACCESSIBILITY =====
function initAccessibility() {
  // Add ARIA labels
  elements.answerBox.setAttribute("aria-label", "Answer input field");
  elements.submitBtn.setAttribute("aria-label", "Submit answer");
  elements.hintBtn.setAttribute("aria-label", "Get hint");

  // Add live region for score updates
  const liveRegion = document.createElement("div");
  liveRegion.setAttribute("aria-live", "polite");
  liveRegion.setAttribute("aria-atomic", "true");
  liveRegion.className = "sr-only";
  liveRegion.id = "live-region";
  document.body.appendChild(liveRegion);

  // Announce score changes
  const originalUpdateScore = updateScore;
  updateScore = function () {
    originalUpdateScore();
    const liveRegion = document.getElementById("live-region");
    if (liveRegion) {
      liveRegion.textContent = `Score updated to ${gameState.score}`;
    }
  };
}

// ===== INITIALIZATION =====
function init() {
  try {
    console.log("Initializing game...");
    console.log(
      "Google signin button:",
      document.getElementById("google-signin-btn")
    );

    // Clean up any existing restriction messages from previous sessions
    const existingRestrictions = document.querySelectorAll(
      ".attempt-restriction"
    );
    existingRestrictions.forEach((restriction) => restriction.remove());

    initEventListeners();
    initAuth();
    initAccessibility();
    optimizePerformance();

    // Show loading state
    console.log("DSSA Tech Quiz Game initialized");
  } catch (error) {
    console.error("Initialization error:", error);
    handleError(error, "initialization");
  }
}

// ===== START THE GAME =====
document.addEventListener("DOMContentLoaded", init);

// ===== TESTING UTILITIES =====
function clearUserAttempts() {
  if (gameState.user) {
    const attemptKey = `attempt_${gameState.user.uid}`;
    localStorage.removeItem(attemptKey);

    // Clean up any existing restriction messages
    const existingRestriction = document.querySelector(".attempt-restriction");
    if (existingRestriction) {
      existingRestriction.remove();
    }

    // Reset game state
    // gameState.hasAttempted = false; // Commented out for multiple attempts
    // gameState.attemptId = null; // Commented out for multiple attempts

    // Show game area again
    const gameArea = document.getElementById("game-area");
    if (gameArea) {
      gameArea.style.display = "block";
    }

    // Reset status indicator
    elements.playerStatus.className = "status-indicator ready";
    elements.playerStatus.innerHTML =
      '<span class="status-icon">⏸️</span><span class="status-text">Ready</span>';

    console.log("User attempts cleared for testing");
    showFeedback("Attempts cleared! You can now play again.", "hint");

    // Initialize game for the user
    initGame();
  } else {
    console.log("No user signed in");
  }
}

// Make clearUserAttempts available globally for testing
window.clearUserAttempts = clearUserAttempts;

// ===== EXPORT FOR TESTING =====
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    gameState,
    initGame,
    submitAnswer,
    showHint,
    calculateRank,
    shuffleArray,
    clearUserAttempts,
  };
}
