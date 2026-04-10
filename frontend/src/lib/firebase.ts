import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyA67OEk3wy7MmFGwCVq8t1-rHcIe_iGhnA",
  authDomain: "intelligpa-c883a.firebaseapp.com",
  projectId: "intelligpa-c883a",
  storageBucket: "intelligpa-c883a.firebasestorage.app",
  messagingSenderId: "141982214717",
  appId: "1:141982214717:web:f27939cb6967886eb31854",
  measurementId: "G-YL388T9YW7",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
