import { getIdToken } from 'firebase/auth';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLoginPrompt } from '../context/LoginPromptContext';
import './Chat.css';

const SERVER_URL = import.meta.env.VITE_CHAT_SERVER_URL;

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function Chat() {
  const { user } = useAuth();
  const requestLogin = useLoginPrompt();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // History sent to server (plain text pairs only)
  const serverHistoryRef = useRef<{ role: 'user' | 'assistant'; content: string }[]>([]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    if (!user) {
      requestLogin();
      return;
    }

    setInput('');
    setError(null);
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setLoading(true);

    try {
      const idToken = await getIdToken(user);

      const res = await fetch(`${SERVER_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          idToken,
          history: serverHistoryRef.current,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(body.error ?? res.statusText);
      }

      const data = (await res.json()) as {
        reply: string;
        history: { role: 'user' | 'assistant'; content: string }[];
      };

      serverHistoryRef.current = data.history;
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function clearConversation() {
    setMessages([]);
    serverHistoryRef.current = [];
    setError(null);
  }

  return (
    <div className="chat">
      <div className="chat-header">
        <h2 className="chat-title">Ask about your data</h2>
        {messages.length > 0 && (
          <button className="chat-clear" onClick={clearConversation}>
            Clear
          </button>
        )}
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <p>Ask me anything about your diary or ingredients.</p>
            <div className="chat-suggestions">
              <button
                className="chat-suggestion"
                onClick={() => setInput('How many calories did I eat this week?')}
              >
                How many calories did I eat this week?
              </button>
              <button
                className="chat-suggestion"
                onClick={() => setInput('What was my average weight last month?')}
              >
                What was my average weight last month?
              </button>
              <button
                className="chat-suggestion"
                onClick={() => setInput('Which ingredient has the most calories per unit?')}
              >
                Which ingredient has the most calories per unit?
              </button>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`chat-bubble chat-bubble--${msg.role}`}>
            <span className="chat-bubble-label">{msg.role === 'user' ? 'You' : 'AI'}</span>
            <p className="chat-bubble-text">{msg.content}</p>
          </div>
        ))}

        {loading && (
          <div className="chat-bubble chat-bubble--assistant chat-bubble--loading">
            <span className="chat-bubble-label">AI</span>
            <span className="chat-typing">
              <span />
              <span />
              <span />
            </span>
          </div>
        )}

        {error && <p className="chat-error">{error}</p>}

        <div ref={bottomRef} />
      </div>

      <div className="chat-input-row">
        <textarea
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={user ? 'Ask a question… (Enter to send)' : 'Sign in to chat'}
          disabled={loading || !user}
          rows={2}
        />
        <button
          className="chat-send"
          onClick={sendMessage}
          disabled={loading || !input.trim() || !user}
        >
          Send
        </button>
      </div>
    </div>
  );
}
