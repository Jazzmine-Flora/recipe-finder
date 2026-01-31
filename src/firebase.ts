import { initializeApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB3mAdJp7WnYSNVFrZBK2SyjOHbF7RlgJU",
  authDomain: "recipe-finder-f3b8b.firebaseapp.com",
  projectId: "recipe-finder-f3b8b",
  storageBucket: "recipe-finder-f3b8b.firebasestorage.app",
  messagingSenderId: "813244519347",
  appId: "1:813244519347:web:c7c84bbf44de261562b1c6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth: Auth = getAuth(app);

// Initialize Cloud Firestore
export const db: Firestore = getFirestore(app);

export default app;
