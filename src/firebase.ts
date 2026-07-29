import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration placeholder
// Students can replace this with their actual Firebase Web App credentials
const firebaseConfig = {
  apiKey: "AIzaSyPlaceHolderKeyToAllowTestingWithoutErrors",
  authDomain: "engineering-study-assistant.firebaseapp.com",
  projectId: "engineering-study-assistant",
  storageBucket: "engineering-study-assistant.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:123456789abcdef"
};

let app;
let auth: any = null;
let db: any = null;
let storage: any = null;
let isMockMode = true;

// Check if the configuration has been modified with actual keys
const hasRealConfig = 
  firebaseConfig.apiKey && 
  !firebaseConfig.apiKey.includes('PlaceHolderKey') &&
  !firebaseConfig.apiKey.includes('[YOUR');

if (hasRealConfig) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    isMockMode = false;
    console.log("Firebase initialized successfully. Running in Live Production Mode.");
  } catch (error) {
    console.error("Firebase failed to initialize. Falling back to local Mock Mode.", error);
    isMockMode = true;
  }
} else {
  console.log("Using default configuration. Running in Local Mock Mode.");
  isMockMode = true;
}

export { auth, db, storage, isMockMode, firebaseConfig };
export default app;
