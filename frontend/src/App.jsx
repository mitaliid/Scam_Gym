import { ConversationProvider, useConversation } from '@elevenlabs/react';
import { useEffect, useRef, useState } from 'react';
import Quiz from './Quiz';
import Debrief from './Debrief';
import { Navigation, Landing, About, Dashboard, SignInModal } from './SiteViews';

const SCORING_MESSAGES = [
  'Reading the transcript…',
  'Matching tactics to the rubric…',
  'Comparing what you said to what you did…',
];

const callMono = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

function CallTimer({ session }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const startedAt = session.current?.startedAt ?? performance.now();
    const interval = setInterval(() => {
      setSeconds(Math.floor((performance.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [session]);
  return <span role="timer" aria-label="Call duration" style={{ fontFamily: callMono, fontSize: 24 }}>
    {String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}
  </span>;
}

export default function App() {
  const [view, setView] = useState('landing');
  const [signInOpen, setSignInOpen] = useState(false);
  return (
    <div style={{ background: '#FAFAF8', color: '#1A1A1A', minHeight: '100svh', width: '100vw', alignSelf: 'center', fontFamily: 'system-ui, sans-serif', lineHeight: 1.5, textAlign: 'left' }}>
      <Navigation view={view} onNavigate={setView} onSignIn={() => setSignInOpen(true)} />
      {view === 'landing' && <Landing onDrill={() => setView('drill')} />}
      {view === 'about' && <About />}
      {view === 'dashboard' && <Dashboard onDrill={() => setView('drill')} />}
      {view === 'drill' && <ConversationProvider agentId={import.meta.env.VITE_ELEVENLABS_AGENT_ID}>
        <Call />
      </ConversationProvider>}
      {signInOpen && <SignInModal onClose={() => setSignInOpen(false)} onSignIn={() => {
        setSignInOpen(false);
        setView('dashboard');
      }} />}
    </div>
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
  const [lastFour, setLastFour] = useState('4417');
  const [bankName, setBankName] = useState('Northbridge Savings');
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
          user_name: name.trim() || 'Jordan Reyes',
          account_last4: lastFour,
          bank_name: bankName,
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
        <p role="alert" style={{ color: '#C0392B' }}>{scoreError}</p>
        <button onClick={retryScore} style={{ padding: 8, background: '#1A1A1A', color: '#FAFAF8', border: '1px solid #1A1A1A', borderRadius: 0, boxShadow: 'none' }}>Try again</button>
      </> : <p role="status">{SCORING_MESSAGES[scoringLine]}</p>}
    </div>
  );

  if (stage === 'debrief') return <Debrief
    score={score} round={round} comparison={comparison}
    onTrainGap={trainGap} training={training} trainingError={trainingError}
  />;

  return <PhoneCallScreen
    key={round} round={round} name={name} setName={setName}
    lastFour={lastFour} setLastFour={setLastFour}
    bankName={bankName} setBankName={setBankName}
    sessionReady={sessionReady} sessionError={sessionError}
    conversation={conversation} start={start} session={session}
    log={log} debug={DEBUG}
  />;
}

function PhoneCallScreen({ round, name, setName, lastFour, setLastFour, bankName, setBankName, sessionReady, sessionError, conversation, start, session, log, debug }) {
  const [ready, setReady] = useState(false);
  const canReady = sessionReady && name.trim() !== '' && lastFour.trim() !== '' && bankName.trim() !== '';
  const connected = conversation.status === 'connected';
  const connecting = conversation.status === 'connecting';
  const ended = conversation.status === 'disconnecting' || !Array.isArray(log);
  const inCall = connected || ended;
  const labelStyle = { fontFamily: callMono, fontSize: 11, letterSpacing: '0.16em', color: ready ? '#a2aaa9' : '#6B6B6B' };
  const circleStyle = {
    width: 88, height: 88, borderRadius: '50%', border: '1px solid #343a3c',
    boxShadow: 'none', color: '#101213', display: 'grid', placeItems: 'center', cursor: 'pointer',
  };
  const handset = <svg aria-hidden="true" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 3.1 5.2 2 2 0 0 1 5.1 3h3a1 1 0 0 1 1 .8l.7 3a1 1 0 0 1-.3 1L8 9.3a16 16 0 0 0 6.7 6.7l1.5-1.5a1 1 0 0 1 1-.3l3 .7a1 1 0 0 1 .8 1Z" />
  </svg>;

  return (
    <main style={{ background: ready ? '#101213' : '#FAFAF8', color: ready ? '#e8e7e1' : '#1A1A1A', colorScheme: ready ? 'dark' : 'light', minHeight: '100svh', width: '100vw', alignSelf: 'center', padding: '32px clamp(16px, 5vw, 56px)', boxSizing: 'border-box', fontFamily: 'system-ui, sans-serif', textAlign: 'left', lineHeight: 1.5, display: 'flex', flexDirection: 'column' }}>
      <div style={{ maxWidth: 960, width: '100%', margin: '0 auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <header style={{ fontFamily: callMono, fontSize: 11, letterSpacing: '0.08em', textAlign: 'right', color: ready ? '#a2aaa9' : '#6B6B6B', paddingBottom: 28, borderBottom: `1px solid ${ready ? '#343a3c' : '#E0E0DD'}` }}>
          SCAM GYM · ROUND {round}
        </header>
        {sessionError && <p role="alert" style={{ color: ready ? '#bc7979' : '#C0392B', marginTop: 24 }}>{sessionError}</p>}

        {!ready ? <section style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', width: '100%', maxWidth: 480, margin: '0 auto', padding: '40px 0' }}>
          <div style={{ border: '1px solid #E0E0DD', padding: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
            <label style={{ display: 'block' }}>
              <span style={{ ...labelStyle, display: 'block', marginBottom: 16 }}>YOU ARE</span>
              <input value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '12px 8px', border: '1px solid #E0E0DD', borderRadius: 0, boxShadow: 'none', background: 'transparent', color: '#1A1A1A', fontFamily: 'inherit', fontSize: 28 }} />
            </label>
            <label style={{ display: 'block' }}>
              <span style={{ ...labelStyle, display: 'block', marginBottom: 16 }}>ACCOUNT ENDS IN</span>
              <input value={lastFour} onChange={(e) => setLastFour(e.target.value)} maxLength={4} style={{ width: '100%', boxSizing: 'border-box', padding: '12px 8px', border: '1px solid #E0E0DD', borderRadius: 0, boxShadow: 'none', background: 'transparent', color: '#1A1A1A', fontFamily: callMono, fontSize: 28 }} />
            </label>
            <label style={{ display: 'block' }}>
              <span style={{ ...labelStyle, display: 'block', marginBottom: 16 }}>BANK</span>
              <input value={bankName} onChange={(e) => setBankName(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '12px 8px', border: '1px solid #E0E0DD', borderRadius: 0, boxShadow: 'none', background: 'transparent', color: '#1A1A1A', fontFamily: 'inherit', fontSize: 28 }} />
            </label>
            </div>
            <p style={{ fontFamily: callMono, fontSize: 12, letterSpacing: '0.04em', borderTop: '1px solid #E0E0DD', paddingTop: 24, margin: '20px 0 0', color: '#6B6B6B' }}>{bankName} · ••••{lastFour}</p>
          </div>
          <button type="button" onClick={() => setReady(true)} disabled={!canReady} style={{ width: '100%', marginTop: 24, padding: '18px 24px', border: '1px solid #1A1A1A', borderRadius: 0, boxShadow: 'none', background: '#1A1A1A', color: '#FAFAF8', fontFamily: callMono, fontSize: 14, opacity: canReady ? 1 : 0.45, cursor: canReady ? 'pointer' : 'not-allowed' }}>Ready</button>
        </section> : <section style={{ flex: 1, display: 'flex', flexDirection: 'column', textAlign: 'center' }}>
          <div style={{ padding: 'clamp(48px, 12vh, 120px) 0 40px' }}>
            {!inCall && <p style={{ fontFamily: callMono, fontSize: 14, color: '#a2aaa9', margin: '0 0 20px' }}>(412) 555-0147</p>}
            <h2 style={{ color: '#e8e7e1', fontSize: 'clamp(32px, 6vw, 48px)', fontWeight: 400, margin: '0 0 16px' }}>{bankName}</h2>
            {connected ? <CallTimer session={session} /> : <p role="status" style={{ ...labelStyle, margin: 0 }}>
              {ended ? 'CALL ENDED' : connecting ? 'CONNECTING…' : 'Fraud Prevention'}
            </p>}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 'clamp(48px, 12vw, 120px)', marginTop: 'auto', padding: '32px 0 max(32px, env(safe-area-inset-bottom))' }}>
            {inCall ? <button type="button" aria-label="End call" onClick={() => conversation.endSession()} style={{ ...circleStyle, background: '#bc7979' }}>
              <span style={{ display: 'flex', transform: 'rotate(135deg)' }}>{handset}</span>
            </button> : <>
              <button type="button" aria-label="Decline call" style={{ ...circleStyle, background: '#bc7979' }}>
                <span style={{ display: 'flex', transform: 'rotate(135deg)' }}>{handset}</span>
              </button>
              <button type="button" aria-label="Accept call" onClick={start} disabled={connecting} style={{ ...circleStyle, background: '#83a98c', opacity: connecting ? 0.45 : 1, cursor: connecting ? 'wait' : 'pointer' }}>
                {handset}
              </button>
            </>}
          </div>
        </section>}

        {debug && <pre style={{ background: ready ? '#111' : '#EDEDEA', color: ready ? '#e8e7e1' : '#1A1A1A', padding: 12, marginTop: 16, overflow: 'auto' }}>{JSON.stringify(log, null, 2)}</pre>}
      </div>
    </main>
  );
}
