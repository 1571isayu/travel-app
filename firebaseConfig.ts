// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth"; // <--- 新增這一行
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
const analytics = getAnalytics(app);
export const auth = getAuth(app); // <--- 新增這一行，把驗證功能匯出
export const db = getFirestore(app);