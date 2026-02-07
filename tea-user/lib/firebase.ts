import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { initializeAuth, getAuth, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBGv2ZFGqWbfuqB7NbSasQorHbW58FRwyE",
  authDomain: "tea-leaf-system-9924e.firebaseapp.com",
  databaseURL:
    "https://tea-leaf-system-9924e-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "tea-leaf-system-9924e",
  storageBucket: "tea-leaf-system-9924e.firebasestorage.app",
  messagingSenderId: "581615165713",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// ✅ Try to load RN persistence only if available in this firebase build
let getReactNativePersistence: any = null;
try {
  // some firebase versions expose it here
  getReactNativePersistence =
    require("firebase/auth/react-native").getReactNativePersistence;
} catch {
  try {
    // fallback: some builds attach it differently
    getReactNativePersistence =
      require("firebase/auth").getReactNativePersistence;
  } catch {
    getReactNativePersistence = null;
  }
}

let auth: Auth;
try {
  if (getReactNativePersistence) {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } else {
    auth = getAuth(app);
  }
} catch {
  auth = getAuth(app);
}

export { app, auth };
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
