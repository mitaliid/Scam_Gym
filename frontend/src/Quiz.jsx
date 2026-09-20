import { useState } from 'react';

const OPTIONS = [
  { id: 'a', text: 'Yes, probably real' },
  { id: 'b', text: "I'm not sure" },
  { id: 'c', text: 'No, that was a scam' },
];
const mono = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

export default function Quiz({ onComplete }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const selectOption = async (optionId) => {
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await onComplete({ q1: optionId });
    } catch (e) {
      console.error('quiz submission failed:', e);
      setError('Could not save your answers. Select an option to try again.');
      setSubmitting(false);
    }
  };

  return (
    <main style={{ background: '#FAFAF8', color: '#1A1A1A', minHeight: '100svh', padding: '32px clamp(16px, 5vw, 56px)', boxSizing: 'border-box', fontFamily: 'system-ui, sans-serif', textAlign: 'left', lineHeight: 1.5 }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <header style={{ borderBottom: '1px solid #E0E0DD', paddingBottom: 32 }}>
          <h2 style={{ color: '#1A1A1A', fontSize: 40, lineHeight: 1.2, fontWeight: 400, letterSpacing: '-0.02em', margin: '0 0 24px' }}>What would you do?</h2>
          <p style={{ color: '#6B6B6B', fontSize: 15, margin: 0 }}>Your call is scored. Before we show you — one quick question.</p>
        </header>
        <section aria-labelledby="reflection-question" style={{ padding: '32px 0', borderBottom: '1px solid #E0E0DD' }}>
          <h3 id="reflection-question" style={{ fontSize: 24, fontWeight: 400, lineHeight: 1.4, margin: '0 0 24px' }}>Do you think that was a real call from your bank?</h3>
          <div style={{ display: 'grid', gap: 12 }}>
            {OPTIONS.map((option) => (
              <button type="button" key={option.id} onClick={() => selectOption(option.id)} disabled={submitting}
                style={{ display: 'flex', alignItems: 'baseline', gap: 20, width: '100%', padding: 20, border: '1px solid #E0E0DD', borderRadius: 0, boxShadow: 'none', background: 'transparent', color: '#1A1A1A', textAlign: 'left', fontFamily: 'inherit', fontSize: 16, cursor: submitting ? 'wait' : 'pointer', opacity: submitting ? 0.5 : 1 }}>
                <span aria-hidden="true" style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.16em', color: '#6B6B6B' }}>{option.id.toUpperCase()}</span>
                {option.text}
              </button>
            ))}
          </div>
        </section>
        {submitting && <p role="status" style={{ fontFamily: mono, fontSize: 12, color: '#6B6B6B', marginTop: 24 }}>Saving your answers…</p>}
        {error && <p role="alert" style={{ color: '#C0392B', fontSize: 14, marginTop: 24 }}>{error}</p>}
      </div>
    </main>
  );
}
