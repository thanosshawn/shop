import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, FacebookAuthProvider } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
      apiKey: "AIzaSyBbRiROtkcQUWPWWMl6IHL9nX8GOdDU5ds",
  authDomain: "sample-firebase-ai-app-8051d.firebaseapp.com",
  projectId: "sample-firebase-ai-app-8051d",
  storageBucket: "sample-firebase-ai-app-8051d.firebasestorage.app",
  messagingSenderId: "954206813134",
  appId: "1:954206813134:web:cf93e36ee20a5259b3c99f"
};

// Read ReadMe.MD on GitHub to setup this project properly
// https://github.com/itfeelsharsh/shop/blob/main/README.md

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();

// Initialize Firestore with experimentalForceLongPolling to fix WebChannel connection issues
// This helps prevent 400 Bad Request errors that occur when writing to Firestore
export const db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
    useFetchStreams: false
});
