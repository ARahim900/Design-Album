/**
 * Upload logo to Firebase Storage
 * Run with: npx tsx upload-logo.ts
 */
import { initializeApp } from "firebase/app";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { readFileSync } from "fs";
import { resolve } from "path";

const firebaseConfig = {
  apiKey: "AIzaSyAhCEDiJgIL_H8sYsgW8Y-Bt4VGIinGnQk",
  authDomain: "muscat-bay-album.firebaseapp.com",
  projectId: "muscat-bay-album",
  storageBucket: "muscat-bay-album.firebasestorage.app",
  messagingSenderId: "240453194102",
  appId: "1:240453194102:web:f70c4916a3ff724c5eaa57",
  measurementId: "G-WMEL2L75C5"
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

async function uploadLogo() {
  const logoPath = resolve("public/logo.png");
  const fileBuffer = readFileSync(logoPath);
  
  // Upload to Firebase Storage under 'branding/logo.png'
  const storageRef = ref(storage, "branding/logo.png");
  
  console.log("📤 Uploading logo to Firebase Storage...");
  
  const snapshot = await uploadBytes(storageRef, fileBuffer, {
    contentType: "image/png",
  });
  
  const downloadURL = await getDownloadURL(snapshot.ref);
  
  console.log("✅ Logo uploaded successfully!");
  console.log("📁 Storage path: branding/logo.png");
  console.log("🔗 Download URL:", downloadURL);
  
  process.exit(0);
}

uploadLogo().catch((err) => {
  console.error("❌ Upload failed:", err.message);
  process.exit(1);
});
