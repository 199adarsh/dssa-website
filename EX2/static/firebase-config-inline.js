// Firebase configuration for AI Emoji Translator (Inline version)
// This version can be included directly in HTML without modules

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD6OvluL7QiYeDEqJ-nDRpLuVfqPA4L04g",
  authDomain: "ai-emoji-translator.firebaseapp.com",
  projectId: "ai-emoji-translator",
  storageBucket: "ai-emoji-translator.firebasestorage.app",
  messagingSenderId: "249615849631",
  appId: "1:249615849631:web:e10f77b3fde82552782aaa",
  measurementId: "G-BE2SMMJRMS",
};

// Initialize Firebase (this will be called after Firebase SDK is loaded)
function initializeFirebase() {
  if (typeof firebase !== "undefined") {
    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);

    // Initialize Firebase services
    const auth = firebase.auth();
    const db = firebase.firestore();
    const analytics = firebase.analytics();

    // Make available globally
    window.firebaseAuth = auth;
    window.firebaseDB = db;
    window.firebaseAnalytics = analytics;

    console.log("Firebase initialized successfully");
  } else {
    console.error("Firebase SDK not loaded");
  }
}

// Auto-initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeFirebase);
} else {
  initializeFirebase();
}
