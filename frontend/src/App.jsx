import { ConversationProvider, useConversation } from '@elevenlabs/react';
import { useEffect, useRef, useState } from 'react';
import Quiz from './Quiz';
import Debrief from './Debrief';

const SCORING_MESSAGES = [
  'Reading the transcript…',
  'Matching tactics to the rubric…',
  'Comparing what you said to what you did…',
];

const callMono = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

function CallTimer() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const startedAt = performance.now();
    const interval = setInterval(() => {
      setSeconds(Math.floor((performance.now() - startedAt) / 1000));
    }, 250);
    return () => clearInterval(interval);
  }, []);
  return <span role="timer" aria-label="Call duration" style={{ fontFamily: callMono, fontSize: 24 }}>
    {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
  </span>;
}

export default function App() {
  return (
    <ConversationProvider agentId={import.meta.env.VITE_ELEVENLABS_AGENT_ID}>
      <Call />
    </ConversationProvider>
  );
}

function Call() {
  const DEBUG = false;
  const [stage, setStage] = useState('call');
  const [round, setRound] = useState(1);
  const previousScore = useRef(null);
  const trainingRequest = useRef(false);
  const [training, setTraining] = useState(false);
  const [trainingError, setTrainingError] = useState('');
  const [comparison, setComparison] = useState(null);
  const backendSessionId = useRef(null);
  const sessionRequest = useRef(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState('');
  const [score, setScore] = useState(null);
  const [scoreError, setScoreError] = useState('');
  const scoreRequest = useRef(null);
  const [scoringLine, setScoringLine] = useState(0);
  const [log, setLog] = useState([]);
  const [name, setName] = useState('Jordan Reyes');
  const session = useRef(null);

  useEffect(() => {
    if (stage !== 'scoring' || scoreError) return;
    const interval = setInterval(() => {
      setScoringLine((line) => (line + 1) % SCORING_MESSAGES.length);
    }, 1500);
    return () => clearInterval(interval);
  }, [stage, scoreError]);

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

  const requestScore = async () => {
    setScoreError('');
    try {
      const response = await fetch(`http://localhost:8000/score/${backendSessionId.current}`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error(`Score POST failed: ${response.status}`);
      const nextScore = await response.json();
      if (round === 2 && previousScore.current) {
        const target = previousScore.current.biggest_gap;
        const before = previousScore.current.behaviors.find((behavior) => behavior.name === target);
        const after = nextScore.behaviors.find((behavior) => behavior.name === target);
        setComparison(before && after ? {
          label: before.label,
          round1: before.behavior_pct,
          round2: after.behavior_pct,
        } : null);
      }
      setScore(nextScore);
      return nextScore;
    } catch (e) {
      console.error('scoring failed:', e);
      setScoreError('Could not score your call. Please try again.');
      return null;
    }
  };

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
        scoreRequest.current = requestScore();
        setStage('reflect');
      } catch (e) {
        console.error('transcript submission failed:', e);
      }
    },
  });

  const finishScoring = async () => {
    setScoringLine(0);
    setStage('scoring');
    const result = await scoreRequest.current;
    if (result) setStage('debrief');
  };

  const retryScore = async () => {
    scoreRequest.current = requestScore();
    await finishScoring();
  };

  const completeQuiz = async (answers) => {
    const response = await fetch(`http://localhost:8000/session/${backendSessionId.current}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quiz: answers }),
    });
    if (!response.ok) throw new Error(`Quiz POST failed: ${response.status}`);
    await finishScoring();
  };

  const trainGap = async () => {
    if (round !== 1 || trainingRequest.current) return;
    trainingRequest.current = true;
    setTraining(true);
    setTrainingError('');
    try {
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
      previousScore.current = score;
      backendSessionId.current = session_id;
      scoreRequest.current = null;
      setScore(null);
      setScoreError('');
      setSessionError('');
      setLog([]);
      setSessionReady(true);
      setRound(2);
      setStage('call');
    } catch (e) {
      console.error('training session creation failed:', e);
      setTrainingError('Could not create round 2. Please try again.');
    } finally {
      trainingRequest.current = false;
      setTraining(false);
    }
  };

  const start = async () => {
    setLog([]);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      await conversation.startSession({
        dynamicVariables: {
          user_name: name,
          account_last4: '4417',
          target_behavior: round === 2 ? previousScore.current.biggest_gap : 'none',
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
        <button onClick={retryScore} style={{ padding: 8 }}>Try again</button>
      </> : <p role="status">{SCORING_MESSAGES[scoringLine]}</p>}
    </div>
  );

  if (stage === 'debrief') return <Debrief
    score={score} round={round} comparison={comparison}
    onTrainGap={trainGap} training={training} trainingError={trainingError}
  />;

  const callStatus = conversation.status === 'connected'
    ? { label: 'IN CALL', color: '#83a98c' }
    : conversation.status === 'connecting'
      ? { label: 'CONNECTING', color: '#c3a16b' }
      : conversation.status === 'disconnecting' || !Array.isArray(log)
        ? { label: 'ENDED', color: '#a2aaa9' }
        : { label: 'READY', color: '#a2aaa9' };

  return (
    <main style={{ background: '#101213', color: '#e8e7e1', minHeight: '100svh', padding: '32px clamp(16px, 5vw, 56px)', boxSizing: 'border-box', fontFamily: 'system-ui, sans-serif', textAlign: 'left', lineHeight: 1.5 }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <header style={{ fontFamily: callMono, fontSize: 11, letterSpacing: '0.08em', textAlign: 'right', color: '#a2aaa9', paddingBottom: 28, borderBottom: '1px solid #343a3c' }}>
          SCAM GYM · ROUND {round}
        </header>
        <section style={{ padding: '32px 0', borderBottom: '1px solid #343a3c' }}>
          <h2 style={{ color: '#e8e7e1', fontSize: 40, fontWeight: 400, margin: '0 0 24px' }}>Incoming call</h2>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, minHeight: 36 }}>
            <p role="status" style={{ display: 'flex', alignItems: 'center', gap: 10, margin: 0, fontFamily: callMono, fontSize: 12, letterSpacing: '0.16em', color: callStatus.color }}>
              <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: '50%', background: callStatus.color }} />
              {callStatus.label}
            </p>
            {conversation.status === 'connected' && <CallTimer />}
          </div>
        </section>
        <p style={{ border: '1px solid #343a3c', padding: 20, margin: '32px 0', color: '#a2aaa9' }}>
          You are <span style={{ color: '#e8e7e1' }}>{name}</span>. Your Northbridge account ends in <span style={{ fontFamily: callMono, color: '#e8e7e1' }}>4417</span>.
        </p>
        {sessionError && <p role="alert" style={{ color: '#bc7979', marginBottom: 24 }}>{sessionError}</p>}

        <label style={{ display: 'block', marginBottom: 24 }}>
          <span style={{ display: 'block', fontFamily: callMono, fontSize: 11, letterSpacing: '0.16em', color: '#a2aaa9', marginBottom: 10 }}>YOUR NAME</span>
          <input value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '14px 16px', border: '1px solid #343a3c', borderRadius: 0, boxShadow: 'none', background: '#101213', color: '#e8e7e1', fontFamily: 'inherit', fontSize: 16 }} />
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, paddingTop: 24, borderTop: '1px solid #343a3c' }}>
          <button onClick={start} disabled={!sessionReady} style={{ flex: '1 1 180px', padding: '16px 24px', border: '1px solid #e8e7e1', borderRadius: 0, boxShadow: 'none', background: '#e8e7e1', color: '#101213', fontFamily: callMono, fontSize: 13, opacity: sessionReady ? 1 : 0.45, cursor: sessionReady ? 'pointer' : 'not-allowed' }}>Start call</button>
          <button onClick={() => conversation.endSession()} style={{ flex: '1 1 180px', padding: '16px 24px', border: '1px solid #343a3c', borderRadius: 0, boxShadow: 'none', background: 'transparent', color: '#e8e7e1', fontFamily: callMono, fontSize: 13, cursor: 'pointer' }}>End call</button>
        </div>

      {DEBUG && (
        <pre style={{ background: '#111', color: '#0f0', padding: 12, marginTop: 16, overflow: 'auto' }}>
          {JSON.stringify(log, null, 2)}
        </pre>
      )}
      </div>
    </main>
  );
}
