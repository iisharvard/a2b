// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
// import { getAnalytics } from "firebase/analytics"; // Optional
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID // Optional, remove if not used
};

// Basic validation to ensure variables are loaded (optional but good for DX)
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error("Firebase environment variables are not set. Please check your .env file and ensure they are prefixed with VITE_ (e.g., VITE_FIREBASE_API_KEY).");
  // You might want to throw an error here or render a fallback UI in your app
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the initialized services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Configure storage with custom settings
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Use emulator for storage in development environment
if (isLocalhost && import.meta.env.DEV) {
  try {
    // Connect to Firebase storage emulator if it's running locally
    // Default port is 9199, change if you're using a different port
    connectStorageEmulator(storage, 'localhost', 9199);
    console.log('Connected to Firebase Storage emulator');

    // Connect to Firebase Firestore emulator if it's running locally
    // Default port is 8080
    connectFirestoreEmulator(db, 'localhost', 8080);
    console.log('Connected to Firebase Firestore emulator');

  } catch (error) {
    console.warn('Failed to connect to Emulators, using production Firebase:', error);
  }
}

// export const analytics = getAnalytics(app); // Optional