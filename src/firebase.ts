// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// import { getAnalytics } from "firebase/analytics"; // Optional
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your NEW web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAgFLGYrSPTp_or9F9rVbeuUeaUs_dxsb4",
  authDomain: "negotiation-cb662.firebaseapp.com",
  projectId: "negotiation-cb662",
  storageBucket: "negotiation-cb662.firebasestorage.app",
  messagingSenderId: "224365801884",
  appId: "1:224365801884:web:d0a5bb2b7e9dc656661859",
  measurementId: "G-T8T0C2LCCF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the initialized services
export const auth = getAuth(app);
export const db = getFirestore(app);
// export const analytics = getAnalytics(app); // Optional