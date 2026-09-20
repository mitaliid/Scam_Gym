const mono = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const colors = {
  background: '#101213', text: '#e8e7e1', muted: '#a2aaa9',
  border: '#343a3c', red: '#bc7979', cyan: '#78a5a8', track: '#202628',
};
const sectionStyle = { borderTop: `1px solid ${colors.border}`, padding: '32px 0' };
const labelStyle = {
  fontFamily: mono, fontSize: 11, fontWeight: 400, letterSpacing: '0.16em',
  lineHeight: 1.5, color: colors.muted, margin: '0 0 24px',
};

function timestamp(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export default function Debrief({ score }) {
  const gap = score.behaviors.find((behavior) => behavior.name === score.biggest_gap);

  return (
    <main style={{
      background: colors.background, color: colors.text, minHeight: '100svh',
      padding: '32px clamp(16px, 5vw, 56px)', boxSizing: 'border-box',
      fontFamily: 'system-ui, sans-serif', textAlign: 'left', lineHeight: 1.5,
    }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <header style={{
          fontFamily: mono, fontSize: 11, letterSpacing: '0.08em', textAlign: 'right',
          color: colors.muted, paddingBottom: 28, overflowWrap: 'anywhere',
        }}>
          SESSION {score.session_id} · SCAM GYM · ROUND 1
        </header>

        <section style={sectionStyle}>
          <h2 style={labelStyle}>YOUR RESULT</h2>
          <h1 style={{
            fontSize: 40, lineHeight: 1.2, fontWeight: 400, letterSpacing: '-0.02em',
            color: colors.text, margin: '0 0 24px',
          }}>{score.summary_line}</h1>
          {gap && <p style={{ margin: 0, fontSize: 15, color: colors.muted }}>
            You were <span style={{ fontFamily: mono, color: colors.text }}>{gap.knowledge_pct}%</span> sure.
            {' '}Under pressure you did <span style={{ fontFamily: mono, color: colors.text }}>{gap.behavior_pct}%</span>.
          </p>}
        </section>

        {score.behaviors.length > 0 && <section style={sectionStyle}>
          <h2 style={labelStyle}>WHERE THE GAP IS</h2>
          <div style={{ display: 'grid', gap: 16 }}>
            {score.behaviors.map((behavior) => {
              const critical = behavior.name === score.biggest_gap;
              const didColor = behavior.knowledge_pct - behavior.behavior_pct > 30
                ? colors.red : colors.cyan;
              return (
                <article key={behavior.name} style={{
                  border: `1px solid ${critical ? colors.red : colors.border}`, padding: 20,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
                    <h3 style={{ fontSize: 17, fontWeight: 500, margin: 0 }}>{behavior.label}</h3>
                    {critical && <span style={{ ...labelStyle, color: colors.red, margin: 0 }}>CRITICAL GAP</span>}
                  </div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {[
                      { label: 'SAID', value: behavior.knowledge_pct, color: '#8f999a' },
                      { label: 'DID', value: behavior.behavior_pct, color: didColor },
                    ].map((bar) => (
                      <div key={bar.label} style={{ display: 'grid', gridTemplateColumns: '40px minmax(0, 1fr) 52px', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.08em', color: colors.muted }}>{bar.label}</span>
                        <div role="meter" aria-label={`${behavior.label}: ${bar.label}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={bar.value}
                          style={{ height: 28, background: colors.track }}>
                          <div style={{ width: `${bar.value}%`, height: '100%', background: bar.color }} />
                        </div>
                        <span style={{ fontFamily: mono, fontSize: 14, textAlign: 'right', color: bar.color }}>{bar.value}%</span>
                      </div>
                    ))}
                  </div>
                  {behavior.evidence.length > 0 && <div style={{ marginTop: 20, display: 'grid', gap: 10 }}>
                    {behavior.evidence.map((item, index) => (
                      <blockquote key={index} style={{ margin: 0, display: 'flex', alignItems: 'baseline', gap: 12, fontSize: 13, color: colors.muted }}>
                        <span style={{ fontFamily: mono, flexShrink: 0 }}>{timestamp(item.ts)}</span>
                        <em>“{item.quote}”</em>
                      </blockquote>
                    ))}
                  </div>}
                </article>
              );
            })}
          </div>
        </section>}

        {score.timeline.length > 0 && <section style={sectionStyle}>
          <h2 style={labelStyle}>WHAT HAPPENED</h2>
          <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {score.timeline.map((item, index) => (
              <li key={index} style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: '8px 16px', padding: '16px 0', borderBottom: `1px solid ${colors.border}`, fontSize: 14 }}>
                <span style={{ fontFamily: mono, color: colors.muted }}>{timestamp(item.ts)}</span>
                <span style={{ fontFamily: mono, fontSize: 12, letterSpacing: '0.06em' }}>{item.tactic.toUpperCase()}</span>
                <span style={{ color: colors.muted }} aria-hidden="true">→</span>
                <span style={{ flex: '1 1 180px' }}>{item.user_response}</span>
                <span style={{ fontFamily: mono, fontSize: 12, letterSpacing: '0.08em', color: item.good ? colors.cyan : colors.red }}>
                  {item.good ? 'PASSED' : 'FAILED'}
                </span>
              </li>
            ))}
          </ol>
        </section>}

        <footer style={sectionStyle}>
          <button type="button" style={{
            width: '100%', padding: '18px 24px', borderRadius: 0, boxShadow: 'none',
            border: `1px solid ${colors.text}`, background: colors.text, color: colors.background,
            fontFamily: mono, fontSize: 12, letterSpacing: '0.16em', cursor: 'pointer',
          }}>TRAIN THIS GAP</button>
        </footer>
      </div>
    </main>
  );
}
