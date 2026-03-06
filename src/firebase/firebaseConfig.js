import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAnytyhxW7ZmGAEXcTFiXpIUAMoUm4IhV8",
  authDomain: "salon-project-80cb8.firebaseapp.com",
  projectId: "salon-project-80cb8",
  storageBucket: "salon-project-80cb8.firebasestorage.app",
  messagingSenderId: "601636542822",
  appId: "1:601636542822:web:196e3c246f712577d690a7",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
