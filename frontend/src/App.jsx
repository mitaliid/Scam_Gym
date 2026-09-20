import { ConversationProvider, useConversation } from '@elevenlabs/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import Quiz from './Quiz';
import Debrief from './Debrief';
import { Navigation, Landing, About, Dashboard, Setup, SignInModal } from './SiteViews';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const SCORING_MESSAGES = [
  'Reading the transcript…',
  'Matching tactics to the rubric…',
  'Comparing what you said to what you did…',
];

const callMono = '"JetBrains Mono", monospace';

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
  const [familyName, setFamilyName] = useState('');
  const [members, setMembers] = useState([]);
  const [membersLoaded, setMembersLoaded] = useState(false);
  const [membersError, setMembersError] = useState('');
  const [activeMember, setActiveMember] = useState(null);
  const membersRequest = useRef(0);
  const refreshMembers = useCallback(async () => {
    const request = ++membersRequest.current;
    try {
      const response = await fetch(`${API}/members`);
      if (!response.ok) throw new Error(`Members GET failed: ${response.status}`);
      const data = await response.json();
      const list = Array.isArray(data) ? data : data.members;
      if (!Array.isArray(list) || list.some((member) => !member || !member.id || !Array.isArray(member.drills))) {
        throw new Error('Invalid members response');
      }
      if (request !== membersRequest.current) return;
      setMembers(list);
      setMembersLoaded(true);
      setMembersError('');
    } catch (error) {
      console.error('members fetch failed:', error);
      if (request === membersRequest.current) setMembersError('Could not load family members. Please try again.');
    }
  }, []);
  useEffect(() => {
    // Updates occur only after the members network request settles.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (view === 'dashboard') void refreshMembers();
  }, [view, refreshMembers]);
  const activeView = view === 'dashboard' && membersLoaded && !membersError && members.length === 0 ? 'setup' : view;
  const startMemberDrill = (member) => {
    setActiveMember(member);
    setView('drill');
  };
  const addMember = async (details) => {
    const response = await fetch(`${API}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: details.name,
        age: Number(details.age) || null,
        relationship: details.relationship.toLowerCase(),
        bank_name: details.bankName,
        account_last4: details.lastFour,
      }),
    });
    if (!response.ok) throw new Error(`Members POST failed: ${response.status}`);
    await refreshMembers();
    setView('dashboard');
  };
  return (
    <div className="editorial" style={{ background: '#FBF8F1', color: '#22201B', minHeight: '100svh', width: '100vw', alignSelf: 'center', fontFamily: 'Inter, sans-serif', lineHeight: 1.6, textAlign: 'left' }}>
      <Navigation view={activeView} onNavigate={setView} onSignIn={() => setSignInOpen(true)} />
      {membersError && <p role="alert" style={{ color: '#A8451F', padding: '16px 24px' }}>{membersError} <button onClick={refreshMembers} style={{ background: 'transparent', color: 'inherit', border: '1px solid #E3DCCD', borderRadius: 0, padding: 8 }}>Try again</button></p>}
      {activeView === 'dashboard' && !membersLoaded && !membersError && <p role="status" style={{ padding: 24 }}>Loading family members…</p>}
      {activeView === 'landing' && <Landing onDrill={() => setView('dashboard')} />}
      {activeView === 'about' && <About />}
      {activeView === 'setup' && <Setup onSubmit={addMember} />}
      {activeView === 'dashboard' && membersLoaded && <Dashboard onDrill={startMemberDrill}
        onAddMember={() => setView('setup')} members={members}
        familyName={familyName} setFamilyName={setFamilyName} />}
      {activeView === 'drill' && activeMember && <ConversationProvider agentId={import.meta.env.VITE_ELEVENLABS_AGENT_ID}>
        <Call member={activeMember} onDrillComplete={refreshMembers} />
      </ConversationProvider>}
      {signInOpen && <SignInModal onClose={() => setSignInOpen(false)} onSignIn={() => {
        setSignInOpen(false);
        setView('dashboard');
      }} />}
    </div>
  );
}

function Call({ member, onDrillComplete }) {
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
  const [gutAnswer, setGutAnswer] = useState(null);
  const [scoreError, setScoreError] = useState('');
  const [scoringLine, setScoringLine] = useState(0);
  const [log, setLog] = useState([]);
  const [name, setName] = useState(member.name);
  const [lastFour, setLastFour] = useState(member.account_last4);
  const [bankName, setBankName] = useState(member.bank_name);
  const session = useRef(null);

  useEffect(() => {
    if (stage === 'debrief' && score) onDrillComplete(score);
  }, [stage, score, onDrillComplete]);

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
        const response = await fetch(`${API}/session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quiz: {}, member_id: member.id }),
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
  }, [member.id]);

  const requestScore = async () => {
    setScoringLine(0);
    setStage('scoring');
    setScoreError('');
    try {
      const response = await fetch(`${API}/score/${backendSessionId.current}`, {
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
      setStage('debrief');
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
        const response = await fetch(`${API}/transcript`, {
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

  const retryScore = () => requestScore();

  const completeQuiz = async (answers, gutAnswer) => {
    const response = await fetch(`${API}/session/${backendSessionId.current}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quiz: answers }),
    });
    if (!response.ok) throw new Error(`Quiz POST failed: ${response.status}`);
    setGutAnswer(gutAnswer);
    await requestScore();
  };

  const trainGap = async () => {
    if (round !== 1 || trainingRequest.current) return;
    trainingRequest.current = true;
    setTraining(true);
    setTrainingError('');
    try {
      const response = await fetch(`${API}/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quiz: {}, member_id: member.id }),
      });
      if (!response.ok) throw new Error(`Session POST failed: ${response.status}`);
      const { session_id } = await response.json();
      if (typeof session_id !== 'string' || !session_id.trim()) {
        throw new Error('Session response is missing a session_id');
      }
      previousScore.current = score;
      backendSessionId.current = session_id;
      setScore(null);
      setGutAnswer(null);
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
          user_name: name.trim() || member.name,
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
    <div className="editorial-page" style={{ padding: 24, fontFamily: 'Inter, sans-serif', maxWidth: 800 }}>
      {scoreError ? <>
        <p role="alert" style={{ color: '#A8451F' }}>{scoreError}</p>
        <button onClick={retryScore} style={{ padding: 8, background: '#22201B', color: '#FBF8F1', border: '1px solid #22201B', borderRadius: 0, boxShadow: 'none' }}>Try again</button>
      </> : <p role="status">{SCORING_MESSAGES[scoringLine]}</p>}
    </div>
  );

  if (stage === 'debrief') return <Debrief
    score={score} round={round} comparison={comparison} gutAnswer={gutAnswer}
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
  const labelStyle = { fontFamily: callMono, fontSize: 11, letterSpacing: '0.16em', color: ready ? '#a2aaa9' : '#4A453C' };
  const circleStyle = {
    width: 88, height: 88, borderRadius: '50%', border: '1px solid #343a3c',
    boxShadow: 'none', color: '#101213', display: 'grid', placeItems: 'center', cursor: 'pointer',
  };
  const handset = <svg aria-hidden="true" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 3.1 5.2 2 2 0 0 1 5.1 3h3a1 1 0 0 1 1 .8l.7 3a1 1 0 0 1-.3 1L8 9.3a16 16 0 0 0 6.7 6.7l1.5-1.5a1 1 0 0 1 1-.3l3 .7a1 1 0 0 1 .8 1Z" />
  </svg>;

  return (
    <main className={ready ? 'phone-dark' : 'pre-call editorial-page'} style={{ background: ready ? '#101213' : '#FBF8F1', color: ready ? '#e8e7e1' : '#22201B', colorScheme: ready ? 'dark' : 'light', minHeight: '100svh', width: '100vw', alignSelf: 'center', padding: '24px 40px', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif', textAlign: 'left', lineHeight: 1.6, display: 'flex', flexDirection: 'column' }}>
      <div style={{ maxWidth: 960, width: '100%', margin: '0 auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <header style={{ fontFamily: callMono, fontSize: 11, letterSpacing: '0.08em', textAlign: 'right', color: ready ? '#a2aaa9' : '#4A453C', paddingBottom: 24, borderBottom: `1px solid ${ready ? '#343a3c' : '#E3DCCD'}` }}>
          SCAM GYM · ROUND {round}
        </header>
        {sessionError && <p role="alert" style={{ color: ready ? '#bc7979' : '#A8451F', marginTop: 24 }}>{sessionError}</p>}

        {!ready ? <section style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', width: '100%', maxWidth: 480, margin: '0 auto', padding: '40px 0' }}>
          <div style={{ border: '1px solid #E3DCCD', padding: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
            <label style={{ display: 'block' }}>
              <span style={{ ...labelStyle, display: 'block', marginBottom: 16 }}>YOU ARE</span>
              <input value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '8px 8px', border: '1px solid #E3DCCD', borderRadius: 0, boxShadow: 'none', background: 'transparent', color: '#22201B', fontFamily: 'inherit', fontSize: 28 }} />
            </label>
            <label style={{ display: 'block' }}>
              <span style={{ ...labelStyle, display: 'block', marginBottom: 16 }}>ACCOUNT ENDS IN</span>
              <input value={lastFour} onChange={(e) => setLastFour(e.target.value)} maxLength={4} style={{ width: '100%', boxSizing: 'border-box', padding: '8px 8px', border: '1px solid #E3DCCD', borderRadius: 0, boxShadow: 'none', background: 'transparent', color: '#22201B', fontFamily: callMono, fontSize: 28 }} />
            </label>
            <label style={{ display: 'block' }}>
              <span style={{ ...labelStyle, display: 'block', marginBottom: 16 }}>BANK</span>
              <input value={bankName} onChange={(e) => setBankName(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '8px 8px', border: '1px solid #E3DCCD', borderRadius: 0, boxShadow: 'none', background: 'transparent', color: '#22201B', fontFamily: 'inherit', fontSize: 28 }} />
            </label>
            </div>
            <p style={{ fontFamily: callMono, fontSize: 12, letterSpacing: '0.04em', borderTop: '1px solid #E3DCCD', paddingTop: 24, margin: '16px 0 0', color: '#4A453C' }}>{bankName} · ••••{lastFour}</p>
          </div>
          <button type="button" onClick={() => setReady(true)} disabled={!canReady} style={{ width: '100%', marginTop: 24, padding: '16px 24px', border: '1px solid #22201B', borderRadius: 0, boxShadow: 'none', background: '#22201B', color: '#FBF8F1', fontFamily: callMono, fontSize: 14, opacity: canReady ? 1 : 0.45, cursor: canReady ? 'pointer' : 'not-allowed' }}>Ready</button>
        </section> : <section style={{ flex: 1, display: 'flex', flexDirection: 'column', textAlign: 'center' }}>
          <div style={{ padding: '64px 0 40px', width: '100%' }}>
            {!inCall && <p style={{ fontFamily: callMono, fontSize: 14, color: '#a2aaa9', margin: '0 0 16px', textAlign: 'center' }}>(412) 555-0147</p>}
            <h2 style={{ color: '#e8e7e1', fontSize: 'clamp(32px, 6vw, 48px)', fontWeight: 600, margin: '0 0 16px' }}>{bankName}</h2>
            {connected ? <CallTimer session={session} /> : <p role="status" style={{ ...labelStyle, margin: 0, textAlign: 'center' }}>
              {ended ? 'CALL ENDED' : connecting ? 'CONNECTING…' : 'Fraud Prevention'}
            </p>}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '64px', marginTop: 'auto', padding: '24px 0 max(24px, env(safe-area-inset-bottom))' }}>
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

        {debug && <pre style={{ background: ready ? '#111' : '#EDEDEA', color: ready ? '#e8e7e1' : '#22201B', padding: 8, marginTop: 16, overflow: 'auto' }}>{JSON.stringify(log, null, 2)}</pre>}
      </div>
    </main>
  );
}
