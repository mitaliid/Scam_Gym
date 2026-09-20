import { useState } from 'react';

import quizData from './quiz.json';

const QUESTIONS = [{
  id: 'gut',
  prompt: 'Do you think that was a real call from your bank?',
  options: [
    { id: 'a', text: 'Yes, probably real' },
    { id: 'b', text: "I'm not sure" },
    { id: 'c', text: 'No, that was a scam' },
  ],
}, ...quizData.questions];
const mono = '"JetBrains Mono", monospace';

export default function Quiz({ onComplete }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [gutAnswer, setGutAnswer] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const selectOption = async (optionId) => {
    if (submitting) return;
    if (index === 0) {
      setGutAnswer(optionId);
      setIndex(1);
      return;
    }
    const nextAnswers = { ...answers, [QUESTIONS[index].id]: optionId };
    setAnswers(nextAnswers);
    if (index < QUESTIONS.length - 1) {
      setIndex(index + 1);
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onComplete(nextAnswers, gutAnswer);
    } catch (e) {
      console.error('quiz submission failed:', e);
      setError('Could not save your answers. Select an option to try again.');
      setSubmitting(false);
    }
  };

  return (
    <main style={{ background: '#FAFAF8', color: '#1A1A1A', minHeight: '100svh', padding: '24px 40px', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif', textAlign: 'left', lineHeight: 1.6 }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <header style={{ borderBottom: '1px solid #E0E0DD', paddingBottom: 24 }}>
          <h2 style={{ color: '#1A1A1A', fontSize: 40, lineHeight: 1.1, fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 24px' }}>What would you do?</h2>
          <p style={{ color: '#6B6B6B', fontSize: 16, margin: 0 }}>Five quick questions. Thirty seconds.</p>
        </header>
        {QUESTIONS.map((question, questionIndex) => questionIndex === index && <section key={question.id} aria-labelledby={`question-${question.id}`} style={{ padding: '24px 0', borderBottom: '1px solid #E0E0DD' }}>
          <p style={{ fontFamily: mono, fontSize: 13, color: '#6B6B6B', margin: '0 0 16px' }}>{index + 1} of {QUESTIONS.length}</p>
          <h3 id={`question-${question.id}`} style={{ fontSize: 24, fontWeight: 600, lineHeight: 1.1, margin: '0 0 24px' }}>{question.prompt}</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            {question.options.map((option) => (
              <button type="button" key={option.id} onClick={() => selectOption(option.id)} disabled={submitting}
                style={{ display: 'flex', alignItems: 'baseline', gap: 16, width: '100%', padding: 16, border: '1px solid #E0E0DD', borderRadius: 0, boxShadow: 'none', background: 'transparent', color: '#1A1A1A', textAlign: 'left', fontFamily: 'inherit', fontSize: 16, cursor: submitting ? 'wait' : 'pointer', opacity: submitting ? 0.5 : 1 }}>
                <span aria-hidden="true" style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.16em', color: '#6B6B6B' }}>{option.id.toUpperCase()}</span>
                {option.text}
              </button>
            ))}
          </div>
        </section>)}
        {submitting && <p role="status" style={{ fontFamily: mono, fontSize: 12, color: '#6B6B6B', marginTop: 24 }}>Saving your answers…</p>}
        {error && <p role="alert" style={{ color: '#C0392B', fontSize: 16, marginTop: 24 }}>{error}</p>}
      </div>
    </main>
  );
}
