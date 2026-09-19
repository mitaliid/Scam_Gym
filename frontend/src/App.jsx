import { ConversationProvider, useConversation } from '@elevenlabs/react';
import { useState } from 'react';

export default function App() {
  return (
    <ConversationProvider agentId={import.meta.env.VITE_ELEVENLABS_AGENT_ID}>
      <Call />
    </ConversationProvider>
  );
}

function Call() {
  const [log, setLog] = useState([]);
  const [name, setName] = useState('Jordan Reyes');

  const conversation = useConversation({
    onMessage: (m) => setLog((p) => [...p, m]),
    onError: (e) => console.error('EL error:', e),
    onConnect: () => console.log('connected'),
    onDisconnect: () => console.log('disconnected'),
  });

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