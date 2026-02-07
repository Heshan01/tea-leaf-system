// lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

import {
  initializeAuth,
  getAuth,
  getReactNativePersistence,
} from "firebase/auth";

import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyBGv2ZFGqWbfuqB7NbSasQorHbW58FRwyE",
  authDomain: "tea-leaf-system-9924e.firebaseapp.com",
  databaseURL: "https://tea-leaf-system-9924e-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "tea-leaf-system-9924e",
  storageBucket: "tea-leaf-system-9924e.firebasestorage.app",
  messagingSenderId: "581615165713",
  appId: "1:581615165713:web:b797fe50171cf3f5e1ecb0"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// ✅ Auth (avoid double-init during fast refresh)
export const auth =
  (() => {
    try {
      return initializeAuth(app, {
        persistence: getReactNativePersistence(ReactNativeAsyncStorage),
      });
    } catch (e: any) {
      // if already initialized
      return getAuth(app);
    }
  })();

export const db = getFirestore(app);
export const rtdb = getDatabase(app);
