import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  initializeAuth,
  getAuth,
  getReactNativePersistence,
} from "firebase/auth";

// ✅ Your firebaseConfig
const firebaseConfig = {
  apiKey: "AIzaSyBGv2ZFGqWbfuqB7NbSasQorHbW58FRwyE",
  authDomain: "tea-leaf-system-9924e.firebaseapp.com",
  databaseURL: "https://tea-leaf-system-9924e-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "tea-leaf-system-9924e",
  storageBucket: "tea-leaf-system-9924e.firebasestorage.app",
  messagingSenderId: "581615165713",
  appId: "1:581615165713:web:b797fe50171cf3f5e1ecb0"
};

// ✅ main app singleton
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// ✅ RN Auth persistence (no warning / no already-initialized)
let auth;
try {
  auth = getAuth(app);
} catch {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
}
export { auth };

// ✅ Firestore + RTDB
export const db = getFirestore(app);
export const rtdb = getDatabase(app);

/**
 * ✅ Admin creating driver accounts needs "secondary auth"
 *    so Admin stays logged in.
 */
const adminCreateApp = getApps().find((a) => a.name === "adminCreate")
  ? getApp("adminCreate")
  : initializeApp(firebaseConfig, "adminCreate");

let adminCreateAuth;
try {
  adminCreateAuth = getAuth(adminCreateApp);
} catch {
  adminCreateAuth = initializeAuth(adminCreateApp, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
}
export { adminCreateAuth };
