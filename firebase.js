// Firebase Config – Replace with your own
const firebaseConfig = {
    apiKey: "AIzaSyAITvwHTybX8GmjvCSQqJxsdIxvdQk6fXc",
    authDomain: "streaming-platform-f9483.firebaseapp.com",
    databaseURL: "https://streaming-platform-f9483-default-rtdb.firebaseio.com",
    projectId: "streaming-platform-f9483",
    storageBucket: "streaming-platform-f9483.firebasestorage.app",
    messagingSenderId: "318710283517",
    appId: "1:318710283517:web:4bbdfb5d84279023a71294",
    measurementId: "G-ZG3L31CLH2"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Enable offline persistence
db.enablePersistence().catch(err => console.warn('Firestore persistence:', err));

// Expose globally
window.auth = auth;
window.db = db;
window.storage = storage;