import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDDPpBt3nqQ41sgsREMmFR9x263BW1NpMQ",
  authDomain: "intelligpa.firebaseapp.com",
  projectId: "intelligpa",
  storageBucket: "intelligpa.firebasestorage.app",
  messagingSenderId: "65579267132",
  appId: "1:65579267132:web:32d066d63d9fe53727ff39",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);