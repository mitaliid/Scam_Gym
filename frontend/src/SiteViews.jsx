import { useEffect, useRef } from 'react';

const mono = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const label = { fontFamily: mono, fontSize: 11, letterSpacing: '0.16em', color: '#a2aaa9', margin: '0 0 20px' };
const heading = { color: '#e8e7e1', fontWeight: 400, lineHeight: 1.1, letterSpacing: '-0.03em', margin: '0 0 28px', fontSize: 'clamp(36px, 6vw, 64px)' };
const section = { borderTop: '1px solid #343a3c', padding: '32px 0' };
const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 24 };
const primary = { border: '1px solid #e8e7e1', borderRadius: 0, background: '#e8e7e1', color: '#101213', padding: '16px 24px', fontFamily: mono, fontSize: 13, cursor: 'pointer' };
const secondary = { ...primary, background: 'transparent', color: '#e8e7e1', borderColor: '#343a3c' };
const page = { maxWidth: 960, margin: '0 auto', padding: '64px clamp(16px, 5vw, 56px)' };

export function Navigation({ view, onNavigate, onSignIn }) {
  return <nav aria-label="Main navigation" style={{ position: 'sticky', top: 0, zIndex: 10, background: '#101213', borderBottom: '1px solid #343a3c', padding: '20px clamp(16px, 5vw, 56px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
    <button onClick={() => onNavigate('landing')} style={{ ...secondary, border: 0, padding: 0, letterSpacing: '0.16em', fontSize: 16 }}>SCAM GYM</button>
    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
      {[['landing', 'Home'], ['about', 'How it works'], ['dashboard', 'Dashboard']].map(([target, text]) =>
        <a key={target} href={`#${target}`} aria-current={view === target ? 'page' : undefined} onClick={(event) => { event.preventDefault(); onNavigate(target); }} style={{ fontFamily: mono, fontSize: 12, color: view === target ? '#e8e7e1' : '#a2aaa9', textDecoration: view === target ? 'underline' : 'none', textUnderlineOffset: 6 }}>{text}</a>
      )}
      <button onClick={onSignIn} style={secondary}>Sign in</button>
    </div>
  </nav>;
}

export function Landing({ onDrill }) {
  return <main style={page}>
    <p style={label}>PRACTICE UNDER PRESSURE</p>
    <h1 style={{ ...heading, maxWidth: 760 }}>Knowing isn't the same as doing</h1>
    <p style={{ maxWidth: 650, color: '#a2aaa9', fontSize: 18, margin: '0 0 36px' }}>Older adults lose billions to phone scams. Awareness training doesn't survive contact with real pressure. Practice the moment a caller asks you to act — then see where your instincts and your actions part ways.</p>
    <button style={primary} onClick={onDrill}>Start a drill</button>
    <section aria-label="Scam statistics" style={{ ...grid, ...section, marginTop: 56 }}>
      {[['201,266', 'complaints filed by Americans 60+ in 2025'], ['$7.75B', 'lost'], ['59%', 'year-over-year increase']].map(([value, text]) => <div key={value} style={{ border: '1px solid #343a3c', padding: 24, fontFamily: mono }}>
        <p style={{ fontSize: 32, margin: '0 0 16px' }}>{value}</p>
        <p style={{ fontSize: 12, color: '#a2aaa9', margin: 0 }}>{text}</p>
      </div>)}
    </section>
    <section style={section}>
      <h2 style={label}>HOW IT WORKS</h2>
      <div style={grid}>{[
        ['01', 'Take the call', 'A fictional caller puts familiar scam tactics into practice.'],
        ['02', 'Answer one question', 'Tell us whether you thought the call was real.'],
        ['03', 'See the gap', 'Review what you did under pressure and practice your weakest behavior.'],
      ].map(([number, title, text]) => <div key={number}>
        <p style={{ ...label, color: '#78a5a8' }}>{number}</p>
        <h3 style={{ fontSize: 20, fontWeight: 400, margin: '0 0 12px' }}>{title}</h3>
        <p style={{ color: '#a2aaa9', fontSize: 15, margin: 0 }}>{text}</p>
      </div>)}</div>
    </section>
  </main>;
}

export function About() {
  return <main style={page}>
    <p style={label}>HOW IT WORKS</p>
    <h1 style={heading}>Practice the moment that matters.</h1>
    {[
      ['The problem', 'Recognizing a scam in a checklist is different from resisting a convincing caller. Urgency, authority, and small requests can push people to act before they verify. Scam Gym makes those moments available for practice.'],
      ["Who it's for", 'Adult children protecting a parent, and credit unions and banks running fraud-prevention programs. Short drills give families and teams a concrete way to talk about what to do when a caller applies pressure.'],
      ['How scoring works', 'The model extracts observed behaviors from the call transcript against a fixed rubric, with quotes and timestamps as evidence. Gap arithmetic is computed deterministically from those scores, rather than invented by the model. The debrief highlights the behavior to practice next.'],
      ['Safety', 'Drills are consented and fictional. They use no real institutions and no voice cloning. No real personal information is accepted for the exercise: use a fictional name and made-up account digits, and never share actual banking details or credentials during a drill.'],
    ].map(([title, text]) => <section key={title} style={section}>
      <h2 style={{ ...label, textTransform: 'uppercase' }}>{title}</h2>
      <p style={{ maxWidth: 720, color: '#a2aaa9', margin: 0 }}>{text}</p>
    </section>)}
  </main>;
}

export function Dashboard({ onDrill }) {
  return <main style={page}>
    <p style={label}>HOUSEHOLD · DEMO DATA</p>
    <h1 style={heading}>The Chen family</h1>
    <article style={{ border: '1px solid #343a3c', padding: 24, marginBottom: 32 }}>
      <h2 style={{ color: '#e8e7e1', fontSize: 28, fontWeight: 400, margin: '0 0 28px' }}>Margaret Chen, <span style={{ fontFamily: mono }}>74</span></h2>
      <div style={grid}>
        <div><p style={label}>LAST DRILL</p><p style={{ fontFamily: mono }}>2026-09-18</p></div>
        <div><p style={label}>RESISTANCE SCORE</p><p style={{ fontFamily: mono, color: '#78a5a8', fontSize: 28 }}>72 / 100 <span style={{ fontSize: 12 }}>↑ +14</span></p></div>
        <div><p style={label}>WEAKEST BEHAVIOR</p><p style={{ color: '#bc7979' }}>Independent verification</p></div>
      </div>
    </article>
    <section style={section}>
      <h2 style={label}>PAST DRILLS</h2>
      <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead><tr>{['Date', 'Scenario', 'Score'].map((title) => <th key={title} scope="col" style={{ ...label, padding: '12px 16px', borderBottom: '1px solid #343a3c', textTransform: 'uppercase', fontWeight: 400 }}>{title}</th>)}</tr></thead>
        <tbody>{[['2026-09-18', 'Bank fraud', '72 ↑'], ['2026-09-11', 'Bank fraud', '58'], ['2026-09-04', 'Bank fraud', '41']].map(([date, scenario, score], index) => <tr key={date}>
          <td style={{ fontFamily: mono, padding: 16, borderBottom: '1px solid #343a3c', whiteSpace: 'nowrap' }}>{date}</td>
          <td style={{ padding: 16, borderBottom: '1px solid #343a3c' }}>{scenario}</td>
          <td style={{ fontFamily: mono, padding: 16, borderBottom: '1px solid #343a3c', color: index === 0 ? '#78a5a8' : '#a2aaa9' }}>{score}</td>
        </tr>)}</tbody>
      </table></div>
    </section>
    <button style={primary} onClick={onDrill}>Run a new drill</button>
    <p style={{ color: '#a2aaa9', fontSize: 13, marginTop: 20 }}>In this demo family view, results are shared with the family, not the participant.</p>
  </main>;
}

export function SignInModal({ onClose, onSignIn }) {
  const dialog = useRef(null);
  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);
  const field = { display: 'block', width: '100%', boxSizing: 'border-box', border: '1px solid #343a3c', borderRadius: 0, padding: 14, marginTop: 10, background: '#101213', color: '#e8e7e1', font: 'inherit' };
  return <dialog ref={dialog} onCancel={onClose} aria-labelledby="sign-in-title" style={{ background: '#101213', color: '#e8e7e1', border: '1px solid #343a3c', borderRadius: 0, padding: 32, width: 400, maxWidth: 'calc(100vw - 32px)', boxSizing: 'border-box', textAlign: 'left' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20 }}>
      <h2 id="sign-in-title" style={{ color: '#e8e7e1', fontWeight: 400, margin: 0 }}>Sign in</h2>
      <button type="button" aria-label="Close sign in" onClick={onClose} style={secondary}>×</button>
    </div>
    <p style={{ ...label, margin: '24px 0' }}>DEMO ACCESS · NO AUTHENTICATION</p>
    <form onSubmit={(event) => { event.preventDefault(); onSignIn(); }}>
      <label style={{ ...label, display: 'block' }}>EMAIL<input autoFocus type="email" autoComplete="off" style={field} /></label>
      <label style={{ ...label, display: 'block' }}>PASSWORD<input type="password" autoComplete="off" style={field} /></label>
      <button type="submit" style={{ ...primary, width: '100%' }}>Sign in</button>
    </form>
  </dialog>;
}
