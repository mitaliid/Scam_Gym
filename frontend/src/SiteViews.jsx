import { useEffect, useRef, useState } from 'react';

const mono = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const label = { fontFamily: mono, fontSize: 11, letterSpacing: '0.16em', color: '#6B6B6B', margin: '0 0 20px' };
const heading = { color: '#1A1A1A', fontWeight: 400, lineHeight: 1.1, letterSpacing: '-0.03em', margin: '0 0 28px', fontSize: 'clamp(36px, 6vw, 64px)' };
const section = { borderTop: '1px solid #E0E0DD', padding: '32px 0' };
const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 24 };
const primary = { border: '1px solid #1A1A1A', borderRadius: 0, background: '#1A1A1A', color: '#FAFAF8', padding: '16px 24px', fontFamily: mono, fontSize: 13, cursor: 'pointer' };
const secondary = { ...primary, background: 'transparent', color: '#1A1A1A', borderColor: '#E0E0DD' };
const page = { maxWidth: 960, margin: '0 auto', padding: '64px clamp(16px, 5vw, 56px)' };

export function Navigation({ view, onNavigate, onSignIn }) {
  return <nav aria-label="Main navigation" style={{ position: 'sticky', top: 0, zIndex: 10, background: '#FAFAF8', borderBottom: '1px solid #E0E0DD', padding: '20px clamp(16px, 5vw, 56px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
    <button onClick={() => onNavigate('landing')} style={{ ...secondary, border: 0, padding: 0, letterSpacing: '0.16em', fontSize: 16 }}>SCAM GYM</button>
    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
      {[['landing', 'Home'], ['about', 'How it works'], ['dashboard', 'Dashboard']].map(([target, text]) =>
        <a key={target} href={`#${target}`} aria-current={view === target ? 'page' : undefined} onClick={(event) => { event.preventDefault(); onNavigate(target); }} style={{ fontFamily: mono, fontSize: 12, color: view === target ? '#1A1A1A' : '#6B6B6B', textDecoration: view === target ? 'underline' : 'none', textUnderlineOffset: 6 }}>{text}</a>
      )}
      <button onClick={onSignIn} style={secondary}>Sign in</button>
    </div>
  </nav>;
}

export function Landing({ onDrill }) {
  return <main style={page}>
    <p style={label}>PRACTICE UNDER PRESSURE</p>
    <h1 style={{ ...heading, maxWidth: 760 }}>Knowing isn't the same as doing</h1>
    <p style={{ maxWidth: 650, color: '#6B6B6B', fontSize: 18, margin: '0 0 36px' }}>Older adults lose billions to phone scams. Awareness training doesn't survive contact with real pressure. Practice the moment a caller asks you to act — then see where your instincts and your actions part ways.</p>
    <button style={primary} onClick={onDrill}>Start a drill</button>
    <section aria-label="Scam statistics" style={{ ...grid, ...section, marginTop: 56 }}>
      {[['201,266', 'complaints filed by Americans 60+ in 2025'], ['$7.75B', 'lost'], ['59%', 'year-over-year increase']].map(([value, text]) => <div key={value} style={{ border: '1px solid #E0E0DD', padding: 24, fontFamily: mono }}>
        <p style={{ fontSize: 32, margin: '0 0 16px' }}>{value}</p>
        <p style={{ fontSize: 12, color: '#6B6B6B', margin: 0 }}>{text}</p>
      </div>)}
    </section>
    <section style={section}>
      <h2 style={label}>HOW IT WORKS</h2>
      <div style={grid}>{[
        ['01', 'Take the call', 'A fictional caller puts familiar scam tactics into practice.'],
        ['02', 'Answer one question', 'Tell us whether you thought the call was real.'],
        ['03', 'See the gap', 'Review what you did under pressure and practice your weakest behavior.'],
      ].map(([number, title, text]) => <div key={number}>
        <p style={{ ...label, color: '#1F6F5C' }}>{number}</p>
        <h3 style={{ fontSize: 20, fontWeight: 400, margin: '0 0 12px' }}>{title}</h3>
        <p style={{ color: '#6B6B6B', fontSize: 15, margin: 0 }}>{text}</p>
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
      <p style={{ maxWidth: 720, color: '#6B6B6B', margin: 0 }}>{text}</p>
    </section>)}
  </main>;
}

function EditableField({ value, onCommit, label: fieldLabel, numeric = false }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  if (!editing) return <button type="button" aria-label={`Edit ${fieldLabel}`} onClick={() => { setDraft(String(value)); setEditing(true); }}
    style={{ border: 0, padding: 0, background: 'transparent', color: 'inherit', font: 'inherit', letterSpacing: 'inherit', textAlign: 'left', cursor: 'text' }}>{value}</button>;
  return <input autoFocus aria-label={fieldLabel} type={numeric ? 'number' : 'text'} min={numeric ? 0 : undefined} step={numeric ? 1 : undefined}
    value={draft} onChange={(event) => setDraft(event.target.value)}
    onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); if (event.key === 'Escape') setEditing(false); }}
    onBlur={() => {
      const text = draft.trim();
      if (text && (!numeric || (Number.isInteger(Number(text)) && Number(text) >= 0))) onCommit(numeric ? Number(text) : text);
      setEditing(false);
    }}
    style={{ width: numeric ? '4ch' : '100%', maxWidth: '100%', boxSizing: 'border-box', padding: '8px 12px', border: '1px solid #E0E0DD', borderRadius: 0, boxShadow: 'none', background: '#FAFAF8', color: 'inherit', font: 'inherit' }} />;
}

function Trend({ current, previous }) {
  if (previous === undefined) return null;
  const delta = current - previous;
  return <span style={{ fontFamily: mono, fontSize: 12, color: delta > 0 ? '#1F6F5C' : delta < 0 ? '#C0392B' : '#6B6B6B' }}>
    {delta > 0 ? '↑' : delta < 0 ? '↓' : '→'} {delta > 0 ? '+' : ''}{delta}
  </span>;
}

const behaviorDescriptions = {
  urgency_resistance: 'Acts before thinking it through',
  independent_verification: "Doesn't hang up and call back",
  information_withholding: 'Confirms details when asked',
  authority_deference: 'Trusts anyone who sounds official',
};

export function Dashboard({ onDrill, onAddMember, members, onEditMember, familyName, setFamilyName }) {
  return <main style={page}>
    <p style={label}>HOUSEHOLD · DRILL HISTORY</p>
    <h1 style={heading}><EditableField value={familyName} onCommit={setFamilyName} label="household name" /></h1>
    <button style={{ ...secondary, marginBottom: 32 }} onClick={onAddMember}>Add a family member</button>
    {members.map((member) => {
      const latest = member.drills[0];
      const recent = member.drills.slice(0, 3);
      // A change of five points or less across three drills is treated as flat.
      const change = recent.length > 1 ? latest.score - recent[recent.length - 1].score : 0;
      const note = !latest ? 'No baseline yet.'
        : recent.length < 3 ? `${member.name} is building a baseline. Keep drilling monthly.`
        : change > 5 ? `${member.name} is improving. Keep drilling monthly.`
        : change >= -5 ? `${member.name} hasn't improved across three drills. Worth a conversation.`
        : `${member.name}'s resistance has declined. Worth a conversation.`;
      return <article key={member.id} style={{ border: '1px solid #E0E0DD', padding: 24, marginBottom: 32 }}>
        <h2 style={{ color: '#1A1A1A', fontSize: 28, fontWeight: 400, margin: '0 0 12px' }}>
          <EditableField value={member.name} onCommit={(name) => onEditMember(member.id, { name })} label="member name" />, <span style={{ fontFamily: mono }}><EditableField value={member.age} onCommit={(age) => onEditMember(member.id, { age })} label="member age" numeric /></span>
        </h2>
        <p style={{ ...label, textTransform: 'uppercase' }}>{member.relationship}</p>
        {latest && <>
          <div style={grid}>
            <div><p style={label}>LAST DRILL</p><p style={{ fontFamily: mono }}>{latest.date}</p></div>
            <div><p style={label}>RESISTANCE SCORE</p><p style={{ fontFamily: mono, fontSize: 28 }}>{latest.score} / 100 <Trend current={latest.score} previous={member.drills[1]?.score} /></p></div>
            <div><p style={label}>WEAKEST BEHAVIOR</p><p style={{ color: '#C0392B' }}>{behaviorDescriptions[latest.weakestBehavior] ?? 'Not available'}</p><p style={{ fontFamily: mono, fontSize: 11, color: '#6B6B6B', marginTop: 8, overflowWrap: 'anywhere' }}>{latest.weakestBehavior}</p></div>
          </div>
          <section style={{ ...section, marginTop: 24 }}>
            <h3 style={label}>PAST DRILLS</h3>
            <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead><tr>{['Date', 'Scenario', 'Score'].map((title) => <th key={title} scope="col" style={{ ...label, padding: '12px 16px', borderBottom: '1px solid #E0E0DD', textTransform: 'uppercase', fontWeight: 400 }}>{title}</th>)}</tr></thead>
              <tbody>{member.drills.map((drill, index) => <tr key={drill.id}>
                <td style={{ fontFamily: mono, padding: 16, borderBottom: '1px solid #E0E0DD', whiteSpace: 'nowrap' }}>{drill.date}</td>
                <td style={{ padding: 16, borderBottom: '1px solid #E0E0DD' }}>{drill.scenario}</td>
                <td style={{ fontFamily: mono, padding: 16, borderBottom: '1px solid #E0E0DD' }}>{drill.score} <Trend current={drill.score} previous={member.drills[index + 1]?.score} /></td>
              </tr>)}</tbody>
            </table></div>
          </section>
        </>}
        <p style={{ color: '#6B6B6B', fontSize: 15, margin: '20px 0' }}>{note}</p>
        <button style={primary} onClick={() => onDrill(member.id)}>{latest ? 'Run a new drill' : 'Run first drill'}</button>
      </article>;
    })}
    <p style={{ color: '#6B6B6B', fontSize: 13, marginTop: 20 }}>In this demo family view, results are shared with the family, not the participant.</p>
  </main>;
}

export function Setup({ onSubmit }) {
  const [details, setDetails] = useState({ name: '', age: '', relationship: 'Parent', bankName: '', lastFour: '' });
  const field = { display: 'block', width: '100%', boxSizing: 'border-box', border: '1px solid #E0E0DD', borderRadius: 0, padding: 14, marginTop: 10, background: '#FAFAF8', color: '#1A1A1A', font: 'inherit' };
  const update = (key) => (event) => setDetails((previous) => ({ ...previous, [key]: event.target.value }));
  return <main style={page}>
    <p style={label}>HOUSEHOLD · SETUP</p>
    <h1 style={heading}>Add a family member</h1>
    <form onSubmit={(event) => {
      event.preventDefault();
      if (!details.name.trim() || !details.bankName.trim()) return;
      onSubmit({ ...details, name: details.name.trim(), age: Number(details.age), bankName: details.bankName.trim() });
    }} style={{ maxWidth: 600, display: 'grid', gap: 24 }}>
      <label style={label}>NAME<input required value={details.name} onChange={update('name')} style={field} /></label>
      <label style={label}>AGE<input required type="number" min="0" max="120" step="1" value={details.age} onChange={update('age')} style={field} /></label>
      <label style={label}>RELATIONSHIP TO YOU<select value={details.relationship} onChange={update('relationship')} style={field}>{['Parent', 'Grandparent', 'Spouse', 'Sibling', 'Other'].map((relationship) => <option key={relationship}>{relationship}</option>)}</select></label>
      <label style={label}>THEIR BANK<input required value={details.bankName} onChange={update('bankName')} style={field} /></label>
      <label style={label}>THEIR ACCOUNT LAST FOUR<input required inputMode="numeric" pattern="[0-9]{4}" maxLength={4} value={details.lastFour} onChange={update('lastFour')} style={field} /></label>
      <button style={primary} type="submit">Add family member</button>
    </form>
  </main>;
}

export function SignInModal({ onClose, onSignIn }) {
  const dialog = useRef(null);
  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);
  const field = { display: 'block', width: '100%', boxSizing: 'border-box', border: '1px solid #E0E0DD', borderRadius: 0, padding: 14, marginTop: 10, background: '#FAFAF8', color: '#1A1A1A', font: 'inherit' };
  return <dialog ref={dialog} onCancel={onClose} aria-labelledby="sign-in-title" style={{ background: '#FAFAF8', color: '#1A1A1A', border: '1px solid #E0E0DD', borderRadius: 0, padding: 32, width: 400, maxWidth: 'calc(100vw - 32px)', boxSizing: 'border-box', textAlign: 'left' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20 }}>
      <h2 id="sign-in-title" style={{ color: '#1A1A1A', fontWeight: 400, margin: 0 }}>Sign in</h2>
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
