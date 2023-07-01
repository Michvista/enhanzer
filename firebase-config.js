// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getStorage } from 'firebase/storage'


const firebaseConfig = {
  apiKey: "AIzaSyCOqHCrKYt8LEvTt8KMBeTFVYbtKlYNuqg",
  authDomain: "enhanzer-261c1.firebaseapp.com",
  projectId: "enhanzer-261c1",
  storageBucket: "enhanzer-261c1.appspot.com",
  messagingSenderId: "897736089398",
  appId: "1:897736089398:web:59ec2295999a987d675d97",
  measurementId: "G-8NFZ4M7K5V"
};

// Initialize Firebase
const fireApp = initializeApp(firebaseConfig);
const fireStorage = getStorage(fireApp);

export { fireApp, fireStorage };
