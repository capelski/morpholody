import { GoogleAuthProvider, signInWithPopup, type AuthError } from 'firebase/auth';
import { useState } from 'react';
import { auth } from '../firebase';
import './LoginPromptModal.css';

interface LoginPromptModalProps {
  onClose: () => void;
}

export default function LoginPromptModal({ onClose }: LoginPromptModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    setError(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      onClose();
    } catch (err) {
      setError((err as AuthError).message || 'Sign-in failed. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="login-prompt-overlay" onPointerDown={onClose}>
      <div
        className="login-prompt-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-prompt-title"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <h2 className="login-prompt-title" id="login-prompt-title">
          Sign in to save
        </h2>
        <p className="login-prompt-body">
          Sign in to save your data and access it from any device.
        </p>
        <button
          className="login-prompt-google-btn"
          onClick={handleSignIn}
          disabled={loading}
          type="button"
        >
          {loading ? 'Signing in…' : 'Sign in with Google'}
        </button>
        {error && <p className="login-prompt-error">{error}</p>}
        <button className="login-prompt-cancel" onClick={onClose} type="button">
          Maybe later
        </button>
      </div>
    </div>
  );
}
