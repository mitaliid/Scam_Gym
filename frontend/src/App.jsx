import { ConversationProvider, useConversation } from '@elevenlabs/react';
import { useEffect, useRef, useState } from 'react';
import Quiz from './Quiz';

export default function App() {
  return (
    <ConversationProvider agentId={import.meta.env.VITE_ELEVENLABS_AGENT_ID}>
      <Call />
    </ConversationProvider>
  );
}

function Call() {
  const [stage, setStage] = useState('call');
  const backendSessionId = useRef(null);
  const sessionRequest = useRef(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState('');
  const [score, setScore] = useState(null);
  const [scoreError, setScoreError] = useState('');
  const [log, setLog] = useState([]);
  const [name, setName] = useState('Jordan Reyes');
  const session = useRef(null);

  useEffect(() => {
    let active = true;
    // Reuse the request when StrictMode runs the mount effect twice.
    if (!sessionRequest.current) {
      sessionRequest.current = (async () => {
        const response = await fetch('http://localhost:8000/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quiz: {} }),
        });
        if (!response.ok) throw new Error(`Session POST failed: ${response.status}`);
        const { session_id } = await response.json();
        if (typeof session_id !== 'string' || !session_id.trim()) {
          throw new Error('Session response is missing a session_id');
        }
        return session_id;
      })();
    }
    sessionRequest.current.then((id) => {
      if (!active) return;
      backendSessionId.current = id;
      setSessionReady(true);
    }).catch((e) => {
      if (!active) return;
      console.error('session creation failed:', e);
      setSessionError('Could not create your session. Reload the page to try again.');
    });
    return () => { active = false; };
  }, []);

  const conversation = useConversation({
    onMessage: (m) => {
      if (!session.current) return;
      const { startedAt, turns } = session.current;
      // const last = turns[turns.length - 1];
      // if (last && last.speaker === (m.source === 'user' ? 'user' : 'agent') && last.text === m.message) return;
      turns.push({
        speaker: m.source === 'user' ? 'user' : 'agent',
        text: m.message,
        ts: (performance.now() - startedAt) / 1000,
      });
      setLog([...turns]);
    },
    onError: (e) => console.error('EL error:', e),
    onConnect: () => {
      session.current = { id: backendSessionId.current, startedAt: performance.now(), turns: [] };
      console.log('connected');
    },
    onDisconnect: async () => {
      console.log('disconnected');
      if (!session.current) return;
      const { id, startedAt, turns } = session.current;
      const transcript = {
        session_id: id,
        scenario: 'bank_fraud',
        turns,
        duration_sec: (performance.now() - startedAt) / 1000,
      };
      session.current = null;
      setLog(transcript);
      try {
        const response = await fetch('http://localhost:8000/transcript', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(transcript),
        });
        if (!response.ok) throw new Error(`Transcript POST failed: ${response.status}`);
        setStage('reflect');
      } catch (e) {
        console.error('transcript submission failed:', e);
      }
    },
  });

  const requestScore = async () => {
    setStage('scoring');
    setScoreError('');
    try {
      const response = await fetch(`http://localhost:8000/score/${backendSessionId.current}`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error(`Score POST failed: ${response.status}`);
      setScore(await response.json());
      setStage('debrief');
    } catch (e) {
      console.error('scoring failed:', e);
      setScoreError('Could not score your call. Please try again.');
    }
  };

  const completeQuiz = async (answers) => {
    const response = await fetch(`http://localhost:8000/session/${backendSessionId.current}/quiz`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quiz: answers }),
    });
    if (!response.ok) throw new Error(`Quiz POST failed: ${response.status}`);
    await requestScore();
  };

  const start = async () => {
    setLog([]);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      await conversation.startSession({
        dynamicVariables: {
          user_name: name,
          account_last4: '4417',
          target_behavior: 'none',
        },
      });
    } catch (e) {
      console.error('start failed:', e);
    }
  };

  if (stage === 'reflect') return <Quiz onComplete={completeQuiz} />;

  if (stage === 'scoring') return (
    <div style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 800 }}>
      {scoreError ? <>
        <p role="alert">{scoreError}</p>
        <button onClick={requestScore} style={{ padding: 8 }}>Try again</button>
      </> : <p role="status">Scoring your call…</p>}
    </div>
  );

  if (stage === 'debrief') return (
    <div style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 800 }}>
      <pre style={{ background: '#111', color: '#0f0', padding: 12, overflow: 'auto' }}>
        {JSON.stringify(score, null, 2)}
      </pre>
    </div>
  );

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 800 }}>
      <h2>CP1 spike</h2>
      <p>Status: <strong>{conversation.status}</strong></p>
      {sessionError && <p role="alert">{sessionError}</p>}

      <input value={name} onChange={(e) => setName(e.target.value)} style={{ padding: 8, marginRight: 8 }} />
      <button onClick={start} disabled={!sessionReady} style={{ padding: 8, marginRight: 8 }}>Start call</button>
      <button onClick={() => conversation.endSession()} style={{ padding: 8 }}>End call</button>

      <pre style={{ background: '#111', color: '#0f0', padding: 12, marginTop: 16, overflow: 'auto' }}>
        {JSON.stringify(log, null, 2)}
      </pre>
    </div>
  );
}
