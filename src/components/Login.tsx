import { GoogleAuthProvider, signInWithPopup, type AuthError } from 'firebase/auth';
import { useState } from 'react';
import { auth } from '../firebase';
import './Login.css';

export default function Login() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const signIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (error) {
      setError((error as AuthError).message || 'An error occurred during sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login">
      <h1 className="login-title">Morpholody</h1>
      <button onClick={signIn} className="login-button" type="button" disabled={loading}>
        {loading ? 'Loading…' : 'Sign in with Google'}
      </button>

      {error && <p className="login-error">{error}</p>}
    </div>
  );
}
