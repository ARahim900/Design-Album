import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAhCEDiJgIL_H8sYsgW8Y-Bt4VGIinGnQk",
  authDomain: "muscat-bay-album.firebaseapp.com",
  projectId: "muscat-bay-album",
  storageBucket: "muscat-bay-album.firebasestorage.app",
  messagingSenderId: "240453194102",
  appId: "1:240453194102:web:f70c4916a3ff724c5eaa57",
  measurementId: "G-WMEL2L75C5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
