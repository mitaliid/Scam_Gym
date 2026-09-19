import { ConversationProvider, useConversation } from '@elevenlabs/react';
import { useRef, useState } from 'react';
import Quiz from './Quiz';

export default function App() {
  return (
    <ConversationProvider agentId={import.meta.env.VITE_ELEVENLABS_AGENT_ID}>
      <Call />
    </ConversationProvider>
  );
}

function Call() {
  const [stage, setStage] = useState('quiz');
  const backendSessionId = useRef(null);
  const [log, setLog] = useState([]);
  const [name, setName] = useState('Jordan Reyes');
  const session = useRef(null);

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
      } catch (e) {
        console.error('transcript submission failed:', e);
      }
    },
  });

  const completeQuiz = async (answers) => {
    const response = await fetch('http://localhost:8000/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quiz: answers }),
    });
    if (!response.ok) throw new Error(`Session POST failed: ${response.status}`);
    const { session_id } = await response.json();
    if (typeof session_id !== 'string' || !session_id.trim()) {
      throw new Error('Session response is missing a session_id');
    }
    backendSessionId.current = session_id;
    setStage('call');
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

  if (stage === 'quiz') return <Quiz onComplete={completeQuiz} />;

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 800 }}>
      <h2>CP1 spike</h2>
      <p>Status: <strong>{conversation.status}</strong></p>

      <input value={name} onChange={(e) => setName(e.target.value)} style={{ padding: 8, marginRight: 8 }} />
      <button onClick={start} style={{ padding: 8, marginRight: 8 }}>Start call</button>
      <button onClick={() => conversation.endSession()} style={{ padding: 8 }}>End call</button>

      <pre style={{ background: '#111', color: '#0f0', padding: 12, marginTop: 16, overflow: 'auto' }}>
        {JSON.stringify(log, null, 2)}
      </pre>
    </div>
  );
}
