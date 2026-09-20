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
    <main className="editorial-page" style={{ background: '#FBF8F1', color: '#22201B', minHeight: '100svh', padding: '24px 40px', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif', textAlign: 'left', lineHeight: 1.65 }}>
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>
        <header style={{ borderBottom: '1px solid #E3DCCD', paddingBottom: 24 }}>
          <h2 style={{ color: '#22201B', fontSize: 40, lineHeight: 1.1, fontWeight: 400, letterSpacing: '-0.02em', margin: '0 0 24px' }}>What would you do?</h2>
          <p style={{ color: '#4A453C', fontSize: 15, margin: 0 }}>Five quick questions. Thirty seconds.</p>
        </header>
        {QUESTIONS.map((question, questionIndex) => questionIndex === index && <section key={question.id} aria-labelledby={`question-${question.id}`} style={{ padding: '24px 0', borderBottom: '1px solid #E3DCCD' }}>
          <p style={{ fontFamily: mono, fontSize: 13, color: '#4A453C', margin: '0 0 16px' }}>{index + 1} of {QUESTIONS.length}</p>
          <h3 className="quiz-question" id={`question-${question.id}`} style={{ fontSize: 24, fontWeight: 400, lineHeight: 1.1, margin: '0 0 24px' }}>{question.prompt}</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            {question.options.map((option) => (
              <button className="quiz-option" type="button" key={option.id} onClick={() => selectOption(option.id)} disabled={submitting}
                style={{ display: 'flex', alignItems: 'baseline', gap: 16, width: '100%', padding: 16, border: '1px solid #E3DCCD', borderRadius: 0, boxShadow: 'none', background: 'transparent', color: '#22201B', textAlign: 'left', fontFamily: 'inherit', fontSize: 15, cursor: submitting ? 'wait' : 'pointer', opacity: submitting ? 0.5 : 1 }}>
                <span aria-hidden="true" style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.16em', color: '#4A453C' }}>{option.id.toUpperCase()}</span>
                {option.text}
              </button>
            ))}
          </div>
        </section>)}
        {submitting && <p role="status" style={{ fontFamily: mono, fontSize: 12, color: '#4A453C', marginTop: 24 }}>Saving your answers…</p>}
        {error && <p role="alert" style={{ color: '#A8451F', fontSize: 15, marginTop: 24 }}>{error}</p>}
      </div>
    </main>
  );
}
