import { onAuthStateChanged } from 'firebase/auth';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { auth } from './firebase';
import './index.css';
import { migrateFromIdb } from './migrations/migrateFromIdb';

// Run the one-time IDB→Firestore migration as soon as a user is authenticated.
const unsubscribe = onAuthStateChanged(auth, (user) => {
  if (user) {
    migrateFromIdb(user.uid).catch(console.error);
    unsubscribe();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
