import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics"; 

// 加入這行 @ts-ignore 來忽略 TypeScript 的誤報
// @ts-ignore
import { initializeAuth, getReactNativePersistence } from "firebase/auth"; 

import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCPEDt9Dvi1qKRYbjk6z42Ggs7NTehnCUc",
  authDomain: "travel-app-16e55.firebaseapp.com",
  projectId: "travel-app-16e55",
  storageBucket: "travel-app-16e55.firebasestorage.app",
  messagingSenderId: "888840561992",
  appId: "1:888840561992:web:8307e9f363ddb1ec08bf7d",
  measurementId: "G-GJ8HWGPBX3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);


// 解決報錯：先檢查環境是否支援，再初始化 Analytics (手機上不會執行，避免崩潰)
let analytics;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
  }
});

// 解決警告：使用 initializeAuth 並加入 AsyncStorage，讓使用者的登入狀態可以保留
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

export const db = getFirestore(app);