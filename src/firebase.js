import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCYt7JPfaf6dY1Hx26sRaWqScFQyUtbwLY",
    authDomain: "my-life-manager-9b39d.firebaseapp.com",
    projectId: "my-life-manager-9b39d",
    storageBucket: "my-life-manager-9b39d.firebasestorage.app",
    messagingSenderId: "893289919433",
    appId: "1:893289919433:web:f4b2e8fcbc5a9b6691ae18",
    measurementId: "G-BRYVE29K6T"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };