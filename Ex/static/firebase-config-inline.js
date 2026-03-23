// Firebase configuration for Tech Quiz (Inline version)
// This version can be included directly in HTML without modules

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD7YBXficoM_mMUilkk_Tu2XAFM_Czh6XQ",
  authDomain: "techguess-pro-dssa.firebaseapp.com",
  projectId: "techguess-pro-dssa",
  storageBucket: "techguess-pro-dssa.firebasestorage.app",
  messagingSenderId: "966351355109",
  appId: "1:966351355109:web:39d42f83f5fa551732e80c",
  measurementId: "G-P6XP9W1FXS",
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
