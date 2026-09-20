const mono = '"JetBrains Mono", monospace';
const colors = {
  background: '#FBF8F1', text: '#22201B', muted: '#7A746A',
  border: '#E3DCCD', red: '#A8451F', cyan: '#2F6B4F', track: '#EDEDEA',
};
const sectionStyle = { borderTop: `1px solid ${colors.border}`, padding: '24px 0' };
const labelStyle = {
  fontFamily: mono, fontSize: 13, fontWeight: 400, letterSpacing: '0.16em',
  lineHeight: 1.65, color: colors.red, margin: '0 0 24px',
};

function timestamp(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export default function Debrief({ score, onTrainGap, round = 1, comparison, training = false, trainingError = '', gutAnswer }) {
  const gap = score.behaviors.find((behavior) => behavior.name === score.biggest_gap);
  const delta = comparison ? comparison.round2 - comparison.round1 : 0;
  const allComplied = score.behaviors.length > 0 && score.behaviors.every((behavior) => behavior.behavior_pct === 0);

  return (
    <main className="editorial-page" style={{
      background: colors.background, color: colors.text, minHeight: '100svh',
      padding: '24px 40px', boxSizing: 'border-box',
      fontFamily: 'Inter, sans-serif', textAlign: 'left', lineHeight: 1.65,
    }}>
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>
        {round === 2 && comparison && <section style={{ border: `1px solid ${colors.border}`, padding: 16, marginBottom: 24 }}>
          <h2 className="section-label" style={labelStyle}>TARGETED BEHAVIOR · ROUND COMPARISON</h2>
          <h3 style={{ fontSize: 20, fontWeight: 400, margin: '0 0 16px' }}>{comparison.label}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
            {[
              { label: 'ROUND 1', value: `${comparison.round1}%`, color: colors.text },
              { label: 'DELTA', value: `${delta > 0 ? '+' : ''}${delta} pp`, color: delta > 0 ? colors.cyan : delta < 0 ? colors.red : colors.muted },
              { label: 'ROUND 2', value: `${comparison.round2}%`, color: colors.text },
            ].map((item) => <div key={item.label}>
              <p className="section-label" style={{ ...labelStyle, marginBottom: 8 }}>{item.label}</p>
              <p style={{ margin: 0, fontFamily: mono, fontSize: 'clamp(18px, 4vw, 32px)', color: item.color }}>{item.value}</p>
            </div>)}
          </div>
        </section>}
        <header style={{
          fontFamily: mono, fontSize: 11, letterSpacing: '0.08em', textAlign: 'right',
          color: colors.muted, paddingBottom: 24, overflowWrap: 'anywhere',
        }}>
          SESSION {score.session_id} · SCAM GYM · ROUND {round}
        </header>

        <section style={sectionStyle}>
          <h2 className="section-label" style={labelStyle}>YOUR RESULT</h2>
          {!allComplied && (gutAnswer === 'a' || gutAnswer === 'b') && <p style={{ fontSize: 15, color: colors.muted, margin: '0 0 16px' }}>
            {gutAnswer === 'a' ? 'You said that call seemed real.' : "You weren't sure whether that call was real."}
          </p>}
          <h1 style={{
            fontSize: 44, lineHeight: 1.1, fontWeight: 400, letterSpacing: '-0.02em',
            color: colors.text, margin: '0 0 24px',
          }}>{allComplied ? "You complied with every tactic. That's the most common outcome — and exactly why this exists." : score.summary_line}</h1>
          {!allComplied && gap && <p style={{ margin: 0, fontSize: 15, color: colors.muted }}>
            You were <span style={{ fontFamily: mono, color: colors.text }}>{gap.knowledge_pct}%</span> sure.
            {' '}Under pressure you did <span style={{ fontFamily: mono, color: colors.text }}>{gap.behavior_pct}%</span>.
          </p>}
        </section>

        {score.behaviors.length > 0 && <section style={sectionStyle}>
          <h2 className="section-label" style={labelStyle}>WHERE THE GAP IS</h2>
          <div style={{ display: 'grid', gap: 16 }}>
            {score.behaviors.map((behavior) => {
              const critical = behavior.name === score.biggest_gap;
              const didColor = behavior.knowledge_pct - behavior.behavior_pct > 30
                ? colors.red : colors.cyan;
              return (
                <article key={behavior.name} style={{
                  border: `1px solid ${critical ? colors.red : colors.border}`, padding: 16,
                  background: critical ? '#FDF0EA' : colors.background,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                    <h3 style={{ fontSize: 20, fontWeight: 400, margin: 0 }}>{behavior.label}</h3>
                    {critical && <span className="section-label" style={{ ...labelStyle, color: colors.red, margin: 0 }}>CRITICAL GAP</span>}
                  </div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {[
                      { label: 'SAID', value: behavior.knowledge_pct, color: '#9A9A96' },
                      { label: 'DID', value: behavior.behavior_pct, color: didColor },
                    ].map((bar) => (
                      <div key={bar.label} style={{ display: 'grid', gridTemplateColumns: '40px minmax(0, 1fr) 52px', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.08em', color: colors.muted }}>{bar.label}</span>
                        <div role="meter" aria-label={`${behavior.label}: ${bar.label}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={bar.value}
                          style={{ height: 28, background: colors.track }}>
                          <div style={{ width: `${bar.value}%`, height: '100%', background: bar.color }} />
                        </div>
                        <span style={{ fontFamily: mono, fontSize: 15, textAlign: 'right', color: bar.color }}>{bar.value}%</span>
                      </div>
                    ))}
                  </div>
                  {behavior.evidence.length > 0 && <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
                    {behavior.evidence.map((item, index) => (
                      <blockquote key={index} style={{ margin: 0, display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 15, color: colors.muted }}>
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
          <h2 className="section-label" style={labelStyle}>WHAT HAPPENED</h2>
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

        {round === 1 && <footer style={sectionStyle}>
          {trainingError && <p role="alert" style={{ color: colors.red, marginBottom: 16 }}>{trainingError}</p>}
          <button type="button" onClick={onTrainGap} disabled={training} style={{
            width: '100%', padding: '16px 24px', borderRadius: 0, boxShadow: 'none',
            border: `1px solid ${colors.text}`, background: colors.text, color: colors.background,
            fontFamily: mono, fontSize: 12, letterSpacing: '0.16em', cursor: training ? 'wait' : 'pointer',
          }}>{training ? 'CREATING ROUND 2…' : 'TRAIN THIS GAP'}</button>
        </footer>}
      </div>
    </main>
  );
}
